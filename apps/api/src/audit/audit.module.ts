import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../prisma.service';

/**
 * Audit Module
 *
 * Provides audit logging services for security and compliance.
 *
 * Services:
 * - AuditService: Log and query audit entries
 * - AuditInterceptor: Automatic HTTP request logging
 *
 * Import this module to enable audit logging in your features.
 *
 * @example
 * @Module({
 *   imports: [AuditModule],
 *   controllers: [WorkflowController],
 *   providers: [WorkflowService],
 * })
 * export class WorkflowModule {}
 */
@Module({
  providers: [AuditService, AuditInterceptor, PrismaService],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
