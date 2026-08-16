import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DataOrchestrator } from './orchestrator.service';
import { DataOrchestrationController } from './data-orchestration.controller';
import { LinkedInDataSource } from './sources/linkedin.source';
import { ScraplingDataSource } from './sources/scrapling.source';
import { AICollectionOrchestratorService } from './ai-collection-orchestrator.service';

// Import existing services
import { LinkedInModule } from '../../../../src/linkedin/linkedin.module';
import { LinkedInService } from '../../../../src/linkedin/linkedin.service';
import { LeadsModule } from '../../../../src/leads/leads.module';

/**
 * Data Orchestration Module
 *
 * Provides unified multi-source data collection with:
 * - Source abstraction
 * - Parallel execution
 * - Normalization
 * - Deduplication
 * - Validation
 * - Enrichment
 */
@Module({
  imports: [LinkedInModule, LeadsModule],
  providers: [
    PrismaService,
    DataOrchestrator,
    LinkedInDataSource,
    ScraplingDataSource,
    AICollectionOrchestratorService,
  ],
  controllers: [DataOrchestrationController],
  exports: [DataOrchestrator, AICollectionOrchestratorService],
})
export class DataOrchestrationModule implements OnModuleInit {
  constructor(
    private orchestrator: DataOrchestrator,
    private linkedInSource: LinkedInDataSource,
    private scraplingSource: ScraplingDataSource,
  ) {}

  async onModuleInit() {
    // Register all data sources on module initialization
    this.orchestrator.registerSource(this.linkedInSource);
    this.orchestrator.registerSource(this.scraplingSource);

    // Log available sources
    const sources = this.orchestrator.getAvailableSources();
    console.log(
      `Data Orchestration initialized with ${sources.length} sources:`,
      sources.map((s) => s.config.name).join(', '),
    );
  }
}
