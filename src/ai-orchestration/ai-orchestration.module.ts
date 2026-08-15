import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AIOrchestrationController } from './ai-orchestration.controller';
import { AIOrchestrationService } from './ai-orchestration.service';
import { ModelRegistryService } from './model-registry.service';
import { TaskClassifierService } from './task-classifier.service';
import { ModelRouterService } from './model-router.service';
import { CostTrackerService } from './cost-tracker.service';
import { PromptCacheService } from './prompt-cache.service';
import { BudgetManagerService } from './budget-manager.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [AIOrchestrationController],
  providers: [
    AIOrchestrationService,
    ModelRegistryService,
    TaskClassifierService,
    ModelRouterService,
    CostTrackerService,
    PromptCacheService,
    BudgetManagerService,
  ],
  exports: [
    AIOrchestrationService,
    ModelRegistryService,
    CostTrackerService,
  ],
})
export class AIOrchestrationModule {}
