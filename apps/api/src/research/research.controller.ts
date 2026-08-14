import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResearchService } from './research.service';
import { EmailFinderService } from './services/email-finder.service';
import { CompanyScraperService } from './services/company-scraper.service';
import { LeadGeneratorService } from './services/lead-generator.service';
import { DatasetService } from './services/dataset.service';
import { WebScraperService } from './services/web-scraper.service';

/**
 * Research Controller - 100% FREE Research API
 *
 * All endpoints are completely FREE and unlimited:
 * - No API keys required (optional keys only for enhanced features)
 * - No rate limits
 * - No usage caps
 * - Unlimited scraping
 * - Access to millions of free datasets
 */
@ApiTags('Research')
@Controller('research')
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly emailFinder: EmailFinderService,
    private readonly companyScraper: CompanyScraperService,
    private readonly leadGenerator: LeadGeneratorService,
    private readonly datasetService: DatasetService,
    private readonly webScraper: WebScraperService,
  ) {}

  /**
   * Complete research pipeline (100% FREE)
   */
  @Post('conduct')
  @ApiOperation({ summary: 'Conduct comprehensive research (FREE)' })
  @ApiResponse({ status: 200, description: 'Research completed successfully' })
  async conductResearch(
    @Body()
    dto: {
      industry?: string;
      location?: string;
      jobTitle?: string;
      companySize?: string;
      keywords?: string[];
      limit?: number;
      enrichLeads?: boolean;
      findEmails?: boolean;
      minQualityScore?: number;
    },
  ) {
    return this.researchService.conductResearch(dto);
  }

  /**
   * Quick research - fast company lookup (100% FREE)
   */
  @Post('quick')
  @ApiOperation({ summary: 'Quick company research (FREE)' })
  async quickResearch(
    @Body()
    dto: {
      companyName?: string;
      domain?: string;
      linkedinUrl?: string;
    },
  ) {
    return this.researchService.quickResearch(dto);
  }

  /**
   * Deep research - comprehensive website analysis (100% FREE)
   */
  @Post('deep')
  @ApiOperation({ summary: 'Deep website research (FREE)' })
  async deepResearch(
    @Body()
    dto: {
      companyDomain: string;
      includeContacts?: boolean;
      includeSubPages?: boolean;
      maxPages?: number;
    },
  ) {
    return this.researchService.deepResearch(dto);
  }

  /**
   * Find email for a person (100% FREE)
   */
  @Post('email/find')
  @ApiOperation({ summary: 'Find email address (FREE)' })
  async findEmail(
    @Body()
    dto: {
      firstName: string;
      lastName: string;
      company: string;
      domain?: string;
    },
  ) {
    return this.emailFinder.findEmail(dto);
  }

  /**
   * Verify email (100% FREE)
   */
  @Post('email/verify')
  @ApiOperation({ summary: 'Verify email address (FREE)' })
  async verifyEmail(@Body() dto: { email: string }) {
    return this.emailFinder.verifyEmail(dto.email);
  }

  /**
   * Bulk email finder (100% FREE)
   */
  @Post('email/bulk')
  @ApiOperation({ summary: 'Find multiple emails (FREE)' })
  async findBulkEmails(
    @Body()
    dto: {
      leads: Array<{
        firstName: string;
        lastName: string;
        company: string;
        domain?: string;
      }>;
    },
  ) {
    return this.emailFinder.findBulkEmails(dto.leads);
  }

  /**
   * Get company information (100% FREE)
   */
  @Post('company/info')
  @ApiOperation({ summary: 'Get company information (FREE)' })
  async getCompanyInfo(
    @Body()
    dto: {
      companyName?: string;
      domain?: string;
      linkedin?: string;
    },
  ) {
    return this.companyScraper.getCompanyInfo(dto);
  }

  /**
   * Bulk company enrichment (100% FREE)
   */
  @Post('company/bulk')
  @ApiOperation({ summary: 'Enrich multiple companies (FREE)' })
  async enrichCompanies(
    @Body()
    dto: {
      companies: Array<{
        name?: string;
        domain?: string;
      }>;
    },
  ) {
    return this.companyScraper.enrichCompanies(dto.companies);
  }

  /**
   * Generate leads (100% FREE)
   */
  @Post('leads/generate')
  @ApiOperation({ summary: 'Generate leads (FREE)' })
  async generateLeads(
    @Body()
    dto: {
      industry?: string;
      location?: string;
      jobTitle?: string;
      companySize?: string;
      keywords?: string[];
      limit?: number;
    },
  ) {
    return this.leadGenerator.generateLeads(dto);
  }

  /**
   * Search datasets (100% FREE)
   */
  @Get('datasets/search')
  @ApiOperation({ summary: 'Search free datasets (FREE)' })
  async searchDatasets(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('format') format?: string,
    @Query('limit') limit?: number,
  ) {
    return this.datasetService.searchDatasets({
      query,
      category,
      format,
      limit: limit ? parseInt(limit.toString()) : 50,
    });
  }

  /**
   * Get recommended B2B datasets (100% FREE)
   */
  @Get('datasets/b2b')
  @ApiOperation({ summary: 'Get B2B datasets (FREE)' })
  async getB2BDatasets() {
    return this.datasetService.getB2BDatasets();
  }

  /**
   * Get popular datasets by category (100% FREE)
   */
  @Get('datasets/popular')
  @ApiOperation({ summary: 'Get popular datasets (FREE)' })
  async getPopularDatasets() {
    return this.datasetService.getPopularDatasets();
  }

  /**
   * Download Kaggle dataset (100% FREE, requires free Kaggle API key)
   */
  @Post('datasets/download')
  @ApiOperation({ summary: 'Download Kaggle dataset (FREE)' })
  async downloadDataset(@Body() dto: { datasetRef: string }) {
    return this.datasetService.downloadKaggleDataset(dto.datasetRef);
  }

  /**
   * Scrape website (100% FREE, unlimited)
   */
  @Post('scrape/website')
  @ApiOperation({ summary: 'Scrape any website (FREE)' })
  async scrapeWebsite(
    @Body()
    dto: {
      url: string;
      selectors: Record<string, string>;
      pagination?: any;
      javascript?: boolean;
      delay?: number;
    },
  ) {
    return this.webScraper.scrapeWebsite(dto);
  }

  /**
   * Scrape emails from website (100% FREE)
   */
  @Post('scrape/emails')
  @ApiOperation({ summary: 'Scrape emails from website (FREE)' })
  async scrapeEmails(@Body() dto: { url: string }) {
    return this.webScraper.scrapeEmails(dto.url);
  }

  /**
   * Scrape phone numbers (100% FREE)
   */
  @Post('scrape/phones')
  @ApiOperation({ summary: 'Scrape phone numbers (FREE)' })
  async scrapePhoneNumbers(@Body() dto: { url: string }) {
    return this.webScraper.scrapePhoneNumbers(dto.url);
  }

  /**
   * Scrape social media links (100% FREE)
   */
  @Post('scrape/social')
  @ApiOperation({ summary: 'Scrape social media links (FREE)' })
  async scrapeSocialLinks(@Body() dto: { url: string }) {
    return this.webScraper.scrapeSocialLinks(dto.url);
  }

  /**
   * Deep scrape - entire website (100% FREE)
   */
  @Post('scrape/deep')
  @ApiOperation({ summary: 'Deep scrape entire website (FREE)' })
  async deepScrape(
    @Body()
    dto: {
      startUrl: string;
      maxPages?: number;
      sameDomainOnly?: boolean;
      extractEmails?: boolean;
      extractPhones?: boolean;
      extractSocial?: boolean;
    },
  ) {
    return this.webScraper.deepScrape(dto);
  }

  /**
   * Get API status and free tier limits
   */
  @Get('status')
  @ApiOperation({ summary: 'Get research API status' })
  async getStatus() {
    return {
      status: 'active',
      message: 'All research features are 100% FREE and unlimited!',
      features: {
        emailFinding: {
          methods: ['Hunter.io (25/month)', 'Pattern matching (unlimited)', 'Web scraping (unlimited)'],
          limit: 'Unlimited',
          cost: 'FREE',
        },
        companyScraping: {
          sources: ['Clearbit', 'LinkedIn', 'Crunchbase', 'Wikipedia', 'GitHub'],
          limit: 'Unlimited',
          cost: 'FREE',
        },
        leadGeneration: {
          sources: ['LinkedIn', 'Google Maps', 'GitHub', 'Twitter', 'Product Hunt', 'AngelList'],
          limit: 'Unlimited',
          cost: 'FREE',
        },
        datasets: {
          sources: ['Kaggle', 'Data.gov', 'GitHub', 'UCI'],
          count: 'Millions available',
          cost: 'FREE',
        },
        webScraping: {
          features: ['Multi-page', 'JavaScript sites', 'Anti-bot bypass', 'Deep crawl'],
          limit: 'Unlimited',
          cost: 'FREE',
        },
      },
      optionalKeys: {
        hunter: 'Get 25 free searches/month at hunter.io',
        clearbit: 'Get free tier at clearbit.com',
        kaggle: 'Get free API key at kaggle.com',
      },
    };
  }
}
