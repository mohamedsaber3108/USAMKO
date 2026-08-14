import { Injectable, Logger } from '@nestjs/common';
import { EmailFinderService } from './services/email-finder.service';
import { CompanyScraperService } from './services/company-scraper.service';
import { LeadGeneratorService } from './services/lead-generator.service';
import { DatasetService } from './services/dataset.service';
import { WebScraperService } from './services/web-scraper.service';
import { EnrichmentService } from './services/enrichment.service';

/**
 * Main Research Service - 100% FREE Comprehensive Research Platform
 *
 * Combines all services for deep, comprehensive research:
 * - Email finding (Hunter.io + scraping)
 * - Company information (Clearbit + scraping)
 * - Lead generation (10+ sources)
 * - Dataset integration (Kaggle, Data.gov, etc.)
 * - Web scraping (unlimited)
 * - Contact enrichment (all sources combined)
 */
@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly emailFinder: EmailFinderService,
    private readonly companyScraper: CompanyScraperService,
    private readonly leadGenerator: LeadGeneratorService,
    private readonly datasetService: DatasetService,
    private readonly webScraper: WebScraperService,
    private readonly enrichmentService: EnrichmentService,
  ) {}

  /**
   * Complete research pipeline (100% FREE)
   *
   * This is the main method that orchestrates everything
   */
  async conductResearch(params: {
    industry?: string;
    location?: string;
    jobTitle?: string;
    companySize?: string;
    keywords?: string[];
    limit?: number;
    enrichLeads?: boolean;
    findEmails?: boolean;
    minQualityScore?: number;
  }): Promise<{
    leads: any[];
    datasets: any[];
    statistics: {
      totalLeads: number;
      leadsWithEmails: number;
      averageQualityScore: number;
      sourceBreakdown: Record<string, number>;
    };
    executionTime: number;
  }> {
    const startTime = Date.now();

    this.logger.log('Starting comprehensive research...');
    this.logger.log(`Parameters: ${JSON.stringify(params)}`);

    // Step 1: Generate leads from multiple sources
    this.logger.log('Step 1: Generating leads...');
    let leads = await this.leadGenerator.generateLeads({
      industry: params.industry,
      location: params.location,
      jobTitle: params.jobTitle,
      companySize: params.companySize,
      keywords: params.keywords,
      limit: params.limit || 100,
    });

    this.logger.log(`Generated ${leads.length} leads`);

    // Step 2: Enrich leads (if requested)
    if (params.enrichLeads) {
      this.logger.log('Step 2: Enriching leads...');
      const enrichedResults = await this.enrichmentService.enrichLeads(leads);

      leads = enrichedResults
        .filter((r) => r.enriched) // Remove failed enrichments
        .map((r) => ({
          ...r.original,
          ...r.enriched,
        }));

      this.logger.log(`Enriched ${leads.length} leads`);
    }

    // Step 3: Find emails (if requested)
    if (params.findEmails) {
      this.logger.log('Step 3: Finding emails...');

      for (const lead of leads) {
        if (!lead.email && lead.firstName && lead.lastName && lead.company) {
          try {
            const emailResult = await this.emailFinder.findEmail({
              firstName: lead.firstName,
              lastName: lead.lastName,
              company: lead.company,
              domain: lead.company ? `${lead.company.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
            });

            lead.email = emailResult.email;
            (lead as any).emailConfidence = emailResult.confidence;
            (lead as any).alternativeEmails = emailResult.alternativeEmails;
          } catch (error) {
            this.logger.warn(`Failed to find email for ${lead.firstName} ${lead.lastName}`);
          }
        }
      }

      this.logger.log('Email finding complete');
    }

    // Step 4: Filter by quality score
    if (params.minQualityScore) {
      this.logger.log('Step 4: Filtering by quality score...');
      const beforeCount = leads.length;
      leads = this.enrichmentService.filterHighQualityLeads(
        leads.map((l) => ({ enriched: l })),
        params.minQualityScore,
      ).map((l) => l.enriched);

      this.logger.log(`Filtered from ${beforeCount} to ${leads.length} leads`);
    }

    // Step 5: Find relevant datasets
    this.logger.log('Step 5: Finding relevant datasets...');
    const datasets = await this.datasetService.searchDatasets({
      query: params.industry || params.keywords?.join(' ') || 'B2B companies',
      limit: 10,
    });

    // Step 6: Calculate statistics
    const statistics = this.calculateStatistics(leads);

    const executionTime = Date.now() - startTime;

    this.logger.log(`Research complete in ${executionTime}ms`);
    this.logger.log(`Total leads: ${leads.length}`);
    this.logger.log(`Leads with emails: ${statistics.leadsWithEmails}`);
    this.logger.log(`Average quality score: ${statistics.averageQualityScore}`);

    return {
      leads,
      datasets,
      statistics,
      executionTime,
    };
  }

  /**
   * Quick research (fast, basic enrichment)
   */
  async quickResearch(params: {
    companyName?: string;
    domain?: string;
    linkedinUrl?: string;
  }): Promise<any> {
    this.logger.log(`Quick research for: ${params.companyName || params.domain}`);

    const companyInfo = await this.companyScraper.getCompanyInfo(params);

    return {
      company: companyInfo,
      recommendedDatasets: await this.datasetService.getB2BDatasets(),
    };
  }

  /**
   * Deep research (slow, comprehensive, unlimited data)
   */
  async deepResearch(params: {
    companyDomain: string;
    includeContacts?: boolean;
    includeSubPages?: boolean;
    maxPages?: number;
  }): Promise<any> {
    this.logger.log(`Deep research for: ${params.companyDomain}`);

    // Deep scrape the entire website
    const deepScrapeResult = await this.webScraper.deepScrape({
      startUrl: `https://${params.companyDomain}`,
      maxPages: params.maxPages || 50,
      sameDomainOnly: true,
      extractEmails: params.includeContacts,
      extractPhones: params.includeContacts,
      extractSocial: true,
    });

    // Get company info
    const companyInfo = await this.companyScraper.getCompanyInfo({
      domain: params.companyDomain,
    });

    return {
      company: companyInfo,
      scrapeData: deepScrapeResult,
      summary: {
        pagesScraped: deepScrapeResult.pages.length,
        emailsFound: deepScrapeResult.emails.length,
        phonesFound: deepScrapeResult.phoneNumbers.length,
        socialProfiles: Object.keys(deepScrapeResult.socialLinks).length,
      },
    };
  }

  /**
   * Calculate research statistics
   */
  private calculateStatistics(leads: any[]): any {
    const leadsWithEmails = leads.filter((l) => l.email).length;
    const sourceBreakdown: Record<string, number> = {};

    leads.forEach((lead) => {
      const source = lead.source || 'unknown';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    const qualityScores = leads.map((l) =>
      this.enrichmentService.scoreLeadQuality({ enriched: l }),
    );
    const averageQualityScore = qualityScores.length > 0
      ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
      : 0;

    return {
      totalLeads: leads.length,
      leadsWithEmails,
      averageQualityScore,
      sourceBreakdown,
    };
  }
}
