import { Module } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { EmailFinderService } from './services/email-finder.service';
import { CompanyScraperService } from './services/company-scraper.service';
import { LeadGeneratorService } from './services/lead-generator.service';
import { DatasetService } from './services/dataset.service';
import { WebScraperService } from './services/web-scraper.service';
import { EnrichmentService } from './services/enrichment.service';
import { PrismaService } from '../prisma.service';

/**
 * Research Module - FREE comprehensive data research system
 *
 * Features:
 * - Email finding (Hunter.io API + scraping)
 * - Company information scraping
 * - Lead generation from multiple sources
 * - Kaggle dataset integration
 * - Multi-source web scraping
 * - Contact enrichment pipeline
 */
@Module({
  controllers: [ResearchController],
  providers: [
    ResearchService,
    EmailFinderService,
    CompanyScraperService,
    LeadGeneratorService,
    DatasetService,
    WebScraperService,
    EnrichmentService,
    PrismaService,
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
