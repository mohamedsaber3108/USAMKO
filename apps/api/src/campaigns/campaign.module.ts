import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { CampaignExecutorProcessor } from './jobs/campaign-executor.processor';
import { CampaignExecutionService } from './execution/execution.service';
import { RateLimiterService } from './execution/rate-limiter.service';
import { MessageGeneratorService } from './execution/message-generator.service';
import { TrackerService } from './execution/tracker.service';
import { PrismaService } from '../prisma.service';
import { AutomationModule } from '../automation/automation.module';
import { PlatformModule } from '../platforms/platform.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'campaigns',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
      },
    }),
    AutomationModule,
    PlatformModule,
  ],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CampaignExecutorProcessor,
    CampaignExecutionService,
    RateLimiterService,
    MessageGeneratorService,
    TrackerService,
    PrismaService,
  ],
  exports: [CampaignService, CampaignExecutionService],
})
export class CampaignModule {}
