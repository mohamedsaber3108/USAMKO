import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FreeEmailFinderService, EmailFinderResult } from './free-email-finder.service';
import { EmailVerificationService } from './email-verification.service';

@Injectable()
export class LinkoutService {
  private readonly logger = new Logger(LinkoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailFinder: FreeEmailFinderService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  /**
   * Find email and save to database
   */
  async findAndSave(
    tenantId: string,
    userId: string,
    params: {
      firstName: string;
      lastName: string;
      company: string;
      domain?: string;
      leadId?: string;
    },
  ) {
    this.logger.log(
      `Finding email for ${params.firstName} ${params.lastName} at ${params.domain || params.company}`,
    );

    // Find email using FREE methods
    const result = await this.emailFinder.findEmail({
      firstName: params.firstName,
      lastName: params.lastName,
      company: params.company,
      domain: params.domain,
    });

    // Verify email if found
    let verification = null;
    if (result.email) {
      verification = await this.emailVerification.verifyEmail(result.email);
    }

    // Save to database
    const saved = await this.prisma.emailFinderResult.create({
      data: {
        tenantId,
        userId,
        leadId: params.leadId,
        firstName: params.firstName,
        lastName: params.lastName,
        domain: params.domain || '',
        company: params.company,
        email: result.email,
        confidence: result.confidence,
        source: result.source,
        methods: result.methods,
        alternatives: result.alternativeEmails as any,
        verified: verification?.valid || false,
        verifiedAt: verification ? new Date() : null,
        reputation: verification?.reputation,
        rawData: { result, verification } as any,
      },
    });

    this.logger.log(`Saved email finder result: ${saved.id}`);

    return {
      ...result,
      verification,
      savedId: saved.id,
    };
  }

  /**
   * Find emails for multiple leads (bulk)
   */
  async findBulk(
    tenantId: string,
    userId: string,
    leads: Array<{
      firstName: string;
      lastName: string;
      company: string;
      domain?: string;
      leadId?: string;
    }>,
  ) {
    this.logger.log(`Finding emails for ${leads.length} leads`);

    const results = [];

    for (const lead of leads) {
      try {
        const result = await this.findAndSave(tenantId, userId, lead);
        results.push({
          input: lead,
          ...result,
        });

        // Polite delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to find email for ${lead.firstName} ${lead.lastName}:`, error);
        results.push({
          input: lead,
          email: null,
          error: error.message,
        });
      }
    }

    this.logger.log(`Completed bulk email finding: ${results.length} results`);
    return results;
  }

  /**
   * Get email finder results for a lead
   */
  async getResultsByLead(tenantId: string, leadId: string) {
    return this.prisma.emailFinderResult.findMany({
      where: {
        tenantId,
        leadId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all email finder results for tenant
   */
  async getAllResults(
    tenantId: string,
    filters?: {
      verified?: boolean;
      hasEmail?: boolean;
    },
  ) {
    return this.prisma.emailFinderResult.findMany({
      where: {
        tenantId,
        ...(filters?.verified !== undefined && { verified: filters.verified }),
        ...(filters?.hasEmail !== undefined && {
          email: filters.hasEmail ? { not: null } : null,
        }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(tenantId: string) {
    const [total, withEmail, verified] = await Promise.all([
      this.prisma.emailFinderResult.count({
        where: { tenantId },
      }),
      this.prisma.emailFinderResult.count({
        where: { tenantId, email: { not: null } },
      }),
      this.prisma.emailFinderResult.count({
        where: { tenantId, verified: true },
      }),
    ]);

    const successRate = total > 0 ? (withEmail / total) * 100 : 0;

    return {
      total,
      withEmail,
      verified,
      successRate: Math.round(successRate),
    };
  }

  /**
   * Enrich lead with email
   */
  async enrichLead(
    tenantId: string,
    userId: string,
    leadId: string,
  ) {
    // Get lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Extract domain from company or linkedinUrl
    let domain = null;
    if (lead.linkedinUrl) {
      const match = lead.linkedinUrl.match(/company\/([^\/]+)/);
      if (match) {
        domain = `${match[1]}.com`; // Guess domain
      }
    }

    // Find email
    const result = await this.findAndSave(tenantId, userId, {
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      company: lead.companyId || '',
      domain,
      leadId: lead.id,
    });

    // Update lead with email if found
    if (result.email) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { email: result.email },
      });
    }

    return result;
  }
}
