import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';

export interface EnrichmentOptions {
  findEmail?: boolean;
  verifyEmail?: boolean;
  calculateScore?: boolean;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkoutWorker: LinkoutWorkerService,
  ) {}

  async enrichLead(leadId: string, options: EnrichmentOptions = {}) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { company: true },
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const enrichments: any[] = [];

      // Find email if requested and not already present
      if (options.findEmail && !lead.email) {
        this.logger.log(`Finding email for lead: ${lead.fullName || lead.firstName + ' ' + lead.lastName}`);

        const emailResult = await this.linkoutWorker.findEmail({
          firstName: lead.firstName,
          lastName: lead.lastName,
          fullName: lead.fullName,
          domain: lead.company?.domain,
          linkedinUrl: lead.linkedinUrl,
        });

        if (emailResult.email) {
          // Update lead with found email
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { email: emailResult.email },
          });

          // Save enrichment record
          await this.prisma.leadEnrichment.create({
            data: {
              leadId,
              tenantId: lead.tenantId,
              provider: 'hunter.io',
              type: 'email_finder',
              data: emailResult as any,
              confidence: emailResult.confidence / 100,
              status: 'completed',
            },
          });

          enrichments.push({
            type: 'email',
            value: emailResult.email,
            confidence: emailResult.confidence,
          });
        }
      }

      // Verify email if requested
      if (options.verifyEmail && lead.email) {
        this.logger.log(`Verifying email: ${lead.email}`);

        const verifyResult = await this.linkoutWorker.verifyEmail(lead.email);

        await this.prisma.leadEnrichment.create({
          data: {
            leadId,
            tenantId: lead.tenantId,
            provider: 'hunter.io',
            type: 'email_verification',
            data: verifyResult as any,
            confidence: verifyResult.score / 100,
            status: 'completed',
          },
        });

        enrichments.push({
          type: 'email_verification',
          valid: verifyResult.valid,
          score: verifyResult.score,
        });
      }

      // Calculate lead score if requested
      if (options.calculateScore) {
        const score = await this.calculateLeadScore(lead);

        await this.prisma.lead.update({
          where: { id: leadId },
          data: { score },
        });

        enrichments.push({
          type: 'score',
          value: score,
        });
      }

      this.logger.log(`Enriched lead ${leadId} with ${enrichments.length} enrichments`);
      return enrichments;
    } catch (error) {
      this.logger.error(`Failed to enrich lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  async enrichMultipleLeads(leadIds: string[], options: EnrichmentOptions = {}) {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const enrichments = await this.enrichLead(leadId, options);
        results.push({ leadId, success: true, enrichments });
      } catch (error) {
        this.logger.error(`Failed to enrich lead ${leadId}: ${error.message}`);
        results.push({ leadId, success: false, error: error.message });
      }
    }

    return results;
  }

  private async calculateLeadScore(lead: any): Promise<number> {
    let score = 0;

    // Email presence (30 points)
    if (lead.email) score += 30;

    // LinkedIn profile (20 points)
    if (lead.linkedinUrl) score += 20;

    // Title/role (15 points)
    if (lead.title) score += 15;

    // Company info (15 points)
    if (lead.company) score += 15;

    // Location (10 points)
    if (lead.location || lead.city) score += 10;

    // Phone (10 points)
    if (lead.phone) score += 10;

    // Normalize to 0-100
    return Math.min(100, score);
  }
}
