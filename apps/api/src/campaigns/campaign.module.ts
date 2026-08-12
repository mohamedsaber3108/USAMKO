import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { CampaignExecutorProcessor } from './jobs/campaign-executor.processor';
import { PrismaService } from '../prisma.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'campaigns',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    AutomationModule,
  ],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignExecutorProcessor, PrismaService],
  exports: [CampaignService],
})
export class CampaignModule {}
