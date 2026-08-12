import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WorkflowModule } from './workflow/workflow.module';
import { PlatformModule } from './platforms/platform.module';
import { AutomationModule } from './automation/automation.module';
import { CampaignModule } from './campaigns/campaign.module';
import { AiModule } from './ai/ai.module';
import { ReportModule } from './reports/report.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TenantModule } from './tenant/tenant.module';
import { WebhookModule } from './webhooks/webhook.module';
import { ApiKeyModule } from './api-keys/api-key.module';
import { StorageModule } from './storage/storage.module';
import { NotificationModule } from './notifications/notification.module';
import { SettingsModule } from './settings/settings.module';
import { PrismaService } from './prisma.service';
import { LoggerService } from './common/services/logger.service';
import { RequestTimingMiddleware } from './common/middleware/request-timing.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    WorkflowModule,
    PlatformModule,
    AutomationModule,
    CampaignModule,
    AiModule,
    ReportModule,
    WebhookModule,
    ApiKeyModule,
    StorageModule,
    NotificationModule,
    SettingsModule,
    AnalyticsModule,
    SchedulerModule,
    TenantModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
