import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DataOrchestrationController } from './data-orchestration.controller';
import { DataOrchestrationService } from './data-orchestration.service';
import { QueryPlannerService } from './query-planner.service';
import { OrchestratorService } from './orchestrator.service';
import { SourceRegistryService } from './source-registry.service';
import { NormalizerService } from './normalizer.service';
import { ValidatorService } from './validator.service';
import { EnricherService } from './enricher.service';
import { CacheService } from './cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AIOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { LinkedInModule } from '../linkedin/linkedin.module';
import { LinkoutModule } from '../linkout/linkout.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    AIOrchestrationModule,
    LinkedInModule,
    LinkoutModule,
  ],
  controllers: [DataOrchestrationController],
  providers: [
    DataOrchestrationService,
    QueryPlannerService,
    OrchestratorService,
    SourceRegistryService,
    NormalizerService,
    ValidatorService,
    EnricherService,
    CacheService,
  ],
  exports: [
    DataOrchestrationService,
    SourceRegistryService,
  ],
})
export class DataOrchestrationModule {}
