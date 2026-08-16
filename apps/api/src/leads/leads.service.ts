import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLeadDto, UpdateLeadDto, CollectLeadsDto, LeadSource } from './dto';
import { LinkedInWorkerService } from './workers/linkedin-worker.service';
import { LinkedInAuthenticatedService } from './workers/linkedin-authenticated.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';
import { MapsWorkerService } from './workers/maps-worker.service';
import { EnrichmentService } from './enrichment.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkedInWorker: LinkedInWorkerService,
    private readonly linkedInAuth: LinkedInAuthenticatedService,
    private readonly linkoutWorker: LinkoutWorkerService,
    private readonly mapsWorker: MapsWorkerService,
    private readonly enrichment: EnrichmentService,
  ) {}

  async create(tenantId: string, createLeadDto: CreateLeadDto) {
    try {
      const lead = await this.prisma.lead.create({
        data: {
          ...createLeadDto,
          tenantId,
        },
        include: {
          company: true,
          enrichments: true,
        },
      });

      this.logger.log(`Created lead: ${lead.id}`);
      return lead;
    } catch (error) {
      this.logger.error(`Failed to create lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(tenantId: string, params?: {
    source?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
    skip?: number;
    take?: number;
  }) {
    const where: any = { tenantId };

    if (params?.source) where.source = params.source;
    if (params?.status) where.status = params.status;
    if (params?.minScore) where.score = { gte: params.minScore };
    if (params?.maxScore) where.score = { ...where.score, lte: params.maxScore };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          company: true,
          enrichments: {
            orderBy: { enrichedAt: 'desc' },
            take: 5,
          },
        },
        skip: params?.skip || 0,
        take: params?.take || 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        company: true,
        enrichments: {
          orderBy: { enrichedAt: 'desc' },
        },
        targets: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(tenantId: string, id: string, updateLeadDto: UpdateLeadDto) {
    const existing = await this.findOne(tenantId, id);

    const lead = await this.prisma.lead.update({
      where: { id: existing.id },
      data: updateLeadDto,
      include: {
        company: true,
        enrichments: true,
      },
    });

    this.logger.log(`Updated lead: ${lead.id}`);
    return lead;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    await this.prisma.lead.delete({
      where: { id: existing.id },
    });

    this.logger.log(`Deleted lead: ${id}`);
    return { deleted: true };
  }

  async collect(tenantId: string, collectDto: CollectLeadsDto) {
    this.logger.log(`Collecting leads from ${collectDto.source} for tenant ${tenantId}`);

    let rawLeads: any[] = [];

    switch (collectDto.source) {
      case LeadSource.LINKEDIN:
        rawLeads = await this.collectFromLinkedIn(tenantId, collectDto);
        break;

      case LeadSource.GOOGLE_MAPS:
        rawLeads = await this.collectFromGoogleMaps(tenantId, collectDto);
        break;

      case LeadSource.FACEBOOK:
      case LeadSource.INSTAGRAM:
      case LeadSource.TWITTER:
        throw new Error(`${collectDto.source} collection coming soon. Use LinkedIn or Google Maps for now.`);

      default:
        throw new Error(`Unknown source: ${collectDto.source}`);
    }

    const createdLeads = [];
    for (const rawLead of rawLeads) {
      try {
        const leadData = this.mapRawLeadToDto(rawLead, collectDto.source);
        const lead = await this.create(tenantId, leadData);
        createdLeads.push(lead);
      } catch (error) {
        this.logger.error(`Failed to create lead: ${error.message}`);
      }
    }

    this.logger.log(`Created ${createdLeads.length} leads from ${collectDto.source}`);
    return {
      source: collectDto.source,
      collected: rawLeads.length,
      created: createdLeads.length,
      leads: createdLeads,
    };
  }

  private async collectFromLinkedIn(tenantId: string, params: CollectLeadsDto): Promise<any[]> {
    // Get the first user for this tenant (for account lookup)
    const tenantUser = await this.prisma.user.findFirst({
      where: { tenantId },
      select: { id: true },
    });
    const userId = tenantUser?.id || '';

    if (params.company) {
      // Try authenticated first, falls back to public internally
      return await this.linkedInAuth.searchPeopleAtCompany({
        tenantId,
        userId,
        companyUrl: params.company,
        role: params.role,
        maxResults: params.maxResults || 100,
      });
    } else if (params.industry && params.location) {
      // Discover companies (authenticated with fallback to public)
      const companies = await this.linkedInAuth.discoverCompanies({
        tenantId,
        userId,
        industry: params.industry,
        location: params.location,
        maxCompanies: 10,
      });

      const allPeople = [];
      for (const company of companies.slice(0, 5)) {
        const people = await this.linkedInAuth.searchPeopleAtCompany({
          tenantId,
          userId,
          companyUrl: company.url,
          role: params.role,
          maxResults: params.maxResults ? Math.floor(params.maxResults / 5) : 20,
        });
        allPeople.push(...people);
      }

      return allPeople;
    } else {
      throw new Error('LinkedIn collection requires either company URL or industry + location');
    }
  }

  private async collectFromGoogleMaps(tenantId: string, params: CollectLeadsDto): Promise<any[]> {
    return await this.mapsWorker.collectFromMaps(tenantId, {
      searchQuery: params.searchQuery || `${params.industry} in ${params.location}`,
      location: params.location,
      maxResults: params.maxResults || 100,
    });
  }

  private mapRawLeadToDto(rawLead: any, source: string): CreateLeadDto {
    return {
      firstName: rawLead.firstName || rawLead.name?.split(' ')[0],
      lastName: rawLead.lastName || rawLead.name?.split(' ').slice(1).join(' '),
      fullName: rawLead.name || rawLead.fullName,
      title: rawLead.title || rawLead.role,
      email: rawLead.email,
      phone: rawLead.phone,
      linkedinUrl: rawLead.linkedinUrl || rawLead.url,
      location: rawLead.location || rawLead.address,
      city: rawLead.city,
      country: rawLead.country,
      bio: rawLead.bio || rawLead.description,
      profilePicture: rawLead.profilePicture,
      source,
      sourceUrl: rawLead.url || rawLead.linkedinUrl,
      status: 'new',
      metadata: {
        raw: rawLead,
        collectedAt: new Date().toISOString(),
      },
    };
  }
}
