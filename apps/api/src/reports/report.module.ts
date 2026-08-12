// Report module for managing reports

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AnalyticsService } from '../analytics/analytics.service';

@Module({
  imports: [],
  controllers: [ReportController],
  providers: [ReportService, PrismaService, AnalyticsService],
  exports: [ReportService],
})
export class ReportModule {}