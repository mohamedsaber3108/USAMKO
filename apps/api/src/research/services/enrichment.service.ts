import { Injectable, Logger } from '@nestjs/common';
import { EmailFinderService } from './email-finder.service';
import { CompanyScraperService } from './company-scraper.service';
import { WebScraperService } from './web-scraper.service';

/**
 * Enrichment Service - 100% FREE
 *
 * Combines all data sources to enrich leads with maximum information
 */
@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private readonly emailFinder: EmailFinderService,
    private readonly companyScraper: CompanyScraperService,
    private readonly webScraper: WebScraperService,
  ) {}

  /**
   * Fully enrich a lead with all available FREE data
   */
  async enrichLead(lead: {
    firstName?: string;
    lastName?: string;
    company?: string;
    domain?: string;
    linkedinUrl?: string;
  }): Promise<{
    personal: {
      firstName: string;
      lastName: string;
      email: string | null;
      emailConfidence: number;
      alternativeEmails: string[];
      linkedinUrl: string;
      jobTitle: string;
    };
    company: {
      name: string;
      domain: string;
      description: string;
      industry: string;
      size: string;
      location: any;
      socialProfiles: any;
      metrics: any;
      technologies: string[];
      contacts: any[];
    };
    enrichmentScore: number;
    sources: string[];
  }> {
    const enrichedData: any = {
      personal: {
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: null,
        emailConfidence: 0,
        alternativeEmails: [],
        linkedinUrl: lead.linkedinUrl || '',
        jobTitle: '',
      },
      company: null,
      enrichmentScore: 0,
      sources: [],
    };

    let totalDataPoints = 0;
    let filledDataPoints = 0;

    // Step 1: Find email
    if (lead.firstName && lead.lastName && (lead.company || lead.domain)) {
      try {
        const emailResult = await this.emailFinder.findEmail({
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company || '',
          domain: lead.domain,
        });

        enrichedData.personal.email = emailResult.email;
        enrichedData.personal.emailConfidence = emailResult.confidence;
        enrichedData.personal.alternativeEmails = emailResult.alternativeEmails;
        enrichedData.sources.push(emailResult.source);

        if (emailResult.email) filledDataPoints += 3;
        totalDataPoints += 3;
      } catch (error) {
        this.logger.warn('Email finding failed:', error.message);
        totalDataPoints += 3;
      }
    }

    // Step 2: Enrich company information
    if (lead.company || lead.domain) {
      try {
        const companyInfo = await this.companyScraper.getCompanyInfo({
          companyName: lead.company,
          domain: lead.domain,
        });

        enrichedData.company = companyInfo;
        enrichedData.sources.push(...companyInfo.sources);

        // Count filled company data points
        if (companyInfo.description) filledDataPoints++;
        if (companyInfo.industry) filledDataPoints++;
        if (companyInfo.size) filledDataPoints++;
        if (companyInfo.location?.city) filledDataPoints++;
        if (companyInfo.metrics?.employees) filledDataPoints++;
        if (companyInfo.socialProfiles?.linkedin) filledDataPoints++;

        totalDataPoints += 10;
      } catch (error) {
        this.logger.warn('Company enrichment failed:', error.message);
        totalDataPoints += 10;
      }
    }

    // Step 3: Scrape company website for additional contacts
    if (lead.domain && !enrichedData.personal.email) {
      try {
        const websiteEmails = await this.webScraper.scrapeEmails(`https://${lead.domain}`);
        if (websiteEmails.length > 0) {
          enrichedData.personal.alternativeEmails.push(...websiteEmails.slice(0, 3));
          enrichedData.sources.push('website-scraping');
        }
      } catch (error) {
        this.logger.warn('Website scraping failed:', error.message);
      }
    }

    // Step 4: Get social profiles
    if (lead.domain) {
      try {
        const socialLinks = await this.webScraper.scrapeSocialLinks(`https://${lead.domain}`);
        if (enrichedData.company) {
          enrichedData.company.socialProfiles = {
            ...enrichedData.company.socialProfiles,
            ...socialLinks,
          };
        }
      } catch (error) {
        this.logger.warn('Social links scraping failed:', error.message);
      }
    }

    // Calculate enrichment score (0-100)
    enrichedData.enrichmentScore = totalDataPoints > 0
      ? Math.round((filledDataPoints / totalDataPoints) * 100)
      : 0;

    // Remove duplicate sources
    enrichedData.sources = [...new Set(enrichedData.sources)];

    return enrichedData;
  }

  /**
   * Bulk enrich leads (100% FREE)
   */
  async enrichLeads(leads: Array<any>): Promise<any[]> {
    const enrichedLeads: any[] = [];

    for (const lead of leads) {
      try {
        const enriched = await this.enrichLead(lead);
        enrichedLeads.push({
          original: lead,
          enriched,
        });

        // Polite delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to enrich lead:`, error.message);
        enrichedLeads.push({
          original: lead,
          enriched: null,
          error: error.message,
        });
      }
    }

    return enrichedLeads;
  }

  /**
   * Score lead quality (0-100)
   */
  scoreLeadQuality(lead: any): number {
    let score = 0;

    // Email found (40 points)
    if (lead.personal?.email) {
      score += 40 * (lead.personal.emailConfidence || 0.5);
    }

    // Company info (30 points)
    if (lead.company) {
      if (lead.company.description) score += 5;
      if (lead.company.industry) score += 5;
      if (lead.company.size) score += 5;
      if (lead.company.metrics?.employees) score += 5;
      if (lead.company.socialProfiles?.linkedin) score += 5;
      if (lead.company.domain) score += 5;
    }

    // Personal info (30 points)
    if (lead.personal?.firstName) score += 10;
    if (lead.personal?.lastName) score += 10;
    if (lead.personal?.linkedinUrl) score += 10;

    return Math.round(Math.min(score, 100));
  }

  /**
   * Filter high-quality leads (100% FREE)
   */
  filterHighQualityLeads(leads: any[], minScore = 60): any[] {
    return leads
      .map((lead) => ({
        ...lead,
        qualityScore: this.scoreLeadQuality(lead.enriched),
      }))
      .filter((lead) => lead.qualityScore >= minScore)
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }
}
