import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { RoleManagementService } from './role-management.service';
import { PermissionService } from './permission.service';
import { UsageTrackingService, ResourceType } from './usage-tracking.service';
import { SessionManagementService } from './session-management.service';
import { AuditService } from './audit.service';

import { JwtAuthGuard } from '../../apps/api/src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly userManagement: UserManagementService,
    private readonly roleManagement: RoleManagementService,
    private readonly permissions: PermissionService,
    private readonly usageTracking: UsageTrackingService,
    private readonly sessionManagement: SessionManagementService,
    private readonly audit: AuditService,
  ) {}

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  @Get('users')
  async getUsers(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.userManagement.getUsers(tenantId, {
      status: status as any,
      role,
      search,
    });
  }

  @Get('users/statistics')
  async getUserStatistics(@Query('tenantId') tenantId: string) {
    return this.userManagement.getUserStatistics(tenantId);
  }

  @Post('users/:userId/suspend')
  async suspendUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      adminId: string;
      reason: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.userManagement.suspendUser(
      body.adminId,
      userId,
      body.reason,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Post('users/:userId/enable')
  async enableUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      adminId: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.userManagement.enableUser(
      body.adminId,
      userId,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Post('users/:userId/expiration')
  async setExpiration(
    @Param('userId') userId: string,
    @Body()
    body: {
      adminId: string;
      expiresAt: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.userManagement.setExpiration(
      body.adminId,
      userId,
      new Date(body.expiresAt),
      body.ipAddress,
      body.userAgent,
    );
  }

  @Delete('users/:userId')
  async deleteUser(
    @Param('userId') userId: string,
    @Body()
    body: {
      adminId: string;
      reason: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.userManagement.deleteUser(
      body.adminId,
      userId,
      body.reason,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Post('users/bulk-suspend')
  async bulkSuspend(
    @Body()
    body: {
      adminId: string;
      userIds: string[];
      reason: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.userManagement.bulkSuspend(
      body.adminId,
      body.userIds,
      body.reason,
      body.ipAddress,
      body.userAgent,
    );
  }

  // ============================================================================
  // ROLE MANAGEMENT
  // ============================================================================

  @Get('roles')
  async getRoles(@Query('tenantId') tenantId: string) {
    return this.roleManagement.getRoles(tenantId);
  }

  @Get('roles/default')
  async getDefaultRole(@Query('tenantId') tenantId: string) {
    return this.roleManagement.getDefaultRole(tenantId);
  }

  @Post('roles')
  async createRole(
    @Body()
    body: {
      tenantId: string;
      adminId: string;
      name: string;
      slug: string;
      description?: string;
      permissions: string[];
      featureAccess: Record<string, boolean>;
      platformAccess: string[];
      priority?: number;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.roleManagement.createRole(
      body.tenantId,
      body.adminId,
      {
        name: body.name,
        slug: body.slug,
        description: body.description,
        permissions: body.permissions,
        featureAccess: body.featureAccess,
        platformAccess: body.platformAccess,
        priority: body.priority,
      },
      body.ipAddress,
      body.userAgent,
    );
  }

  @Put('roles/:roleId')
  async updateRole(
    @Param('roleId') roleId: string,
    @Body()
    body: {
      adminId: string;
      name?: string;
      description?: string;
      permissions?: string[];
      featureAccess?: Record<string, boolean>;
      platformAccess?: string[];
      priority?: number;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    const { adminId, ipAddress, userAgent, ...updates } = body;
    return this.roleManagement.updateRole(
      roleId,
      adminId,
      updates,
      ipAddress,
      userAgent,
    );
  }

  @Delete('roles/:roleId')
  async deleteRole(
    @Param('roleId') roleId: string,
    @Body()
    body: {
      adminId: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.roleManagement.deleteRole(
      roleId,
      body.adminId,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Post('users/:userId/roles/:roleId')
  async assignRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body()
    body: {
      adminId: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.roleManagement.assignRole(
      userId,
      roleId,
      body.adminId,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Delete('users/:userId/roles/:roleId')
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Body()
    body: {
      adminId: string;
      ipAddress: string;
      userAgent: string;
    },
  ) {
    return this.roleManagement.removeRole(
      userId,
      roleId,
      body.adminId,
      body.ipAddress,
      body.userAgent,
    );
  }

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: string) {
    return this.roleManagement.getUserRoles(userId);
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  @Get('permissions')
  async getAllPermissions() {
    return this.permissions.getAllPermissions();
  }

  @Get('permissions/grouped')
  async getPermissionsGrouped() {
    return this.permissions.getPermissionsGrouped();
  }

  @Get('permissions/categories')
  async getCategories() {
    return this.permissions.getCategories();
  }

  @Get('permissions/category/:category')
  async getPermissionsByCategory(@Param('category') category: string) {
    return this.permissions.getPermissionsByCategory(category);
  }

  @Post('permissions/check')
  async checkPermission(
    @Body() body: { userId: string; permission: string },
  ) {
    const hasPermission = await this.roleManagement.userHasPermission(
      body.userId,
      body.permission,
    );

    return { hasPermission };
  }

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  @Get('usage/:userId')
  async getCurrentUsage(@Param('userId') userId: string) {
    return this.usageTracking.getCurrentUsage(userId);
  }

  @Get('usage/:userId/statistics')
  async getUsageStatistics(@Param('userId') userId: string) {
    return this.usageTracking.getUsageStatistics(userId);
  }

  @Get('usage/:userId/history')
  async getUsageHistory(
    @Param('userId') userId: string,
    @Query('months') months?: number,
  ) {
    return this.usageTracking.getUsageHistory(
      userId,
      months ? parseInt(months.toString()) : 12,
    );
  }

  @Put('usage/:userId/limits')
  async setLimits(
    @Param('userId') userId: string,
    @Body()
    limits: {
      leadsPerMonth?: number | null;
      campaignsPerMonth?: number | null;
      platformAccountsMax?: number | null;
      aiTokensPerMonth?: number | null;
      storageGB?: number | null;
      alertAt?: number;
    },
  ) {
    return this.usageTracking.setLimits(userId, limits);
  }

  @Post('usage/:userId/track')
  async trackUsage(
    @Param('userId') userId: string,
    @Body() body: { resource: ResourceType; amount?: number },
  ) {
    return this.usageTracking.trackUsage(userId, body.resource, body.amount);
  }

  @Get('usage/alerts/near-limits')
  async getUsersNearLimits(@Query('threshold') threshold?: number) {
    return this.usageTracking.getUsersNearLimits(
      threshold ? parseInt(threshold.toString()) : 80,
    );
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  @Get('sessions/user/:userId')
  async getActiveSessions(@Param('userId') userId: string) {
    return this.sessionManagement.getActiveSessions(userId);
  }

  @Get('sessions/:sessionId')
  async getSessionByToken(@Param('sessionId') sessionId: string) {
    // This would typically use the actual token, not sessionId
    return null; // Placeholder
  }

  @Post('sessions/:sessionId/revoke')
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { revokedBy: string; reason: string },
  ) {
    return this.sessionManagement.revokeSession(
      sessionId,
      body.revokedBy,
      body.reason,
    );
  }

  @Post('sessions/user/:userId/revoke-all')
  async revokeAllUserSessions(
    @Param('userId') userId: string,
    @Body()
    body: {
      tenantId: string;
      revokedBy: string;
      reason: string;
    },
  ) {
    return this.sessionManagement.revokeAllUserSessions(
      body.tenantId,
      userId,
      body.revokedBy,
      body.reason,
    );
  }

  @Get('sessions/user/:userId/statistics')
  async getSessionStatistics(@Param('userId') userId: string) {
    return this.sessionManagement.getSessionStatistics(userId);
  }

  // ============================================================================
  // AUDIT TRAIL
  // ============================================================================

  @Get('audit')
  async getAuditTrail(
    @Query('tenantId') tenantId: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.audit.getAuditTrail(
      tenantId,
      {
        adminId,
        action,
        resource,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      {
        skip: skip ? parseInt(skip.toString()) : undefined,
        take: take ? parseInt(take.toString()) : undefined,
      },
    );
  }

  @Get('audit/resource/:resource')
  async getResourceAuditTrail(
    @Query('tenantId') tenantId: string,
    @Param('resource') resource: string,
  ) {
    return this.audit.getResourceAuditTrail(tenantId, resource);
  }

  @Get('audit/admin/:adminId')
  async getAdminActions(
    @Param('adminId') adminId: string,
    @Query('limit') limit?: number,
  ) {
    return this.audit.getAdminActions(
      adminId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  @Get('audit/statistics')
  async getAuditStatistics(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.audit.getStatistics(tenantId, period);
  }

  @Get('audit/search')
  async searchAuditTrail(
    @Query('tenantId') tenantId: string,
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.audit.search(
      tenantId,
      query,
      limit ? parseInt(limit.toString()) : 50,
    );
  }
}
