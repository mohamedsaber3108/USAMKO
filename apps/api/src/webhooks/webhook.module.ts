// Webhook module for managing webhook integrations

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { CampaignModule } from '../campaigns/campaign.module';
import { PlatformModule } from '../platforms/platform.module';

@Module({
  imports: [CampaignModule, PlatformModule],
  controllers: [WebhookController],
  providers: [WebhookService, PrismaService],
  exports: [WebhookService],
})
export class WebhookModule {}