import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserManagementService } from './user-management.service';
import { RoleManagementService } from './role-management.service';
import { PermissionService } from './permission.service';
import { UsageTrackingService } from './usage-tracking.service';
import { SessionManagementService } from './session-management.service';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [
    UserManagementService,
    RoleManagementService,
    PermissionService,
    UsageTrackingService,
    SessionManagementService,
    AuditService,
  ],
  exports: [
    UserManagementService,
    RoleManagementService,
    PermissionService,
    UsageTrackingService,
    SessionManagementService,
    AuditService,
  ],
})
export class AdminModule {}
