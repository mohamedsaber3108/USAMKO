import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SecurityModule } from './security/security.module';
import { AuditModule } from './audit/audit.module';
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
import { LeadsModule } from './leads/leads.module';
import { ResearchModule } from './research/research.module';
import { PrismaService } from './prisma.service';
import { LoggerService } from './common/services/logger.service';
import { RequestTimingMiddleware } from './common/middleware/request-timing.middleware';
// New Platform Modules
import { LinkedInModule } from '../../../src/linkedin/linkedin.module';
import { LinkoutModule } from '../../../src/linkout/linkout.module';
import { AdminModule } from '../../../src/admin/admin.module';
import { AIOrchestrationModule } from '../../../src/ai-orchestration/ai-orchestration.module';
import { DataOrchestrationModule } from './data-orchestration/data-orchestration.module';

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
    // Security & Audit (Phase 1)
    SecurityModule,
    AuditModule,
    // Feature Modules
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
    LeadsModule,
    ResearchModule, // 100% FREE Research & Data Platform
    // New Platform Modules (2026-08-15)
    LinkedInModule, // LinkedIn integration
    LinkoutModule, // 100% FREE email finder
    AdminModule, // Admin control center
    AIOrchestrationModule, // AI model routing & cost optimization
    DataOrchestrationModule, // Natural language data collection
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
