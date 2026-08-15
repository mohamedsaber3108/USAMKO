import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { AuditService } from './audit.service';
import { SessionManagementService } from './session-management.service';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessionManagement: SessionManagementService,
  ) {}

  /**
   * Suspend user account
   */
  async suspendUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Admin ${adminId} suspending user ${userId}`);

    // Get current user state
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update user status
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        // Note: User model doesn't have status field yet, this is for future enhancement
        // For now, we'll track in metadata
        metadata: {
          ...((user.metadata as any) || {}),
          status: UserStatus.SUSPENDED,
          suspendedAt: new Date().toISOString(),
          suspendedBy: adminId,
          suspendedReason: reason,
        },
      },
    });

    // Revoke all active sessions
    await this.sessionManagement.revokeAllUserSessions(
      user.tenantId,
      userId,
      adminId,
      'user_suspended',
    );

    // Log admin action
    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.suspend',
      resource: `User:${userId}`,
      changes: {
        before: { metadata: user.metadata },
        after: { metadata: updated.metadata },
      },
      reason,
      ipAddress,
      userAgent,
    });

    this.logger.log(`User ${userId} suspended successfully`);
    return updated;
  }

  /**
   * Enable/reactivate user account
   */
  async enableUser(
    adminId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Admin ${adminId} enabling user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...((user.metadata as any) || {}),
          status: UserStatus.ACTIVE,
          suspendedAt: null,
          suspendedBy: null,
          suspendedReason: null,
          enabledAt: new Date().toISOString(),
          enabledBy: adminId,
        },
      },
    });

    // Log admin action
    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.enable',
      resource: `User:${userId}`,
      changes: {
        before: { metadata: user.metadata },
        after: { metadata: updated.metadata },
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`User ${userId} enabled successfully`);
    return updated;
  }

  /**
   * Set account expiration
   */
  async setExpiration(
    adminId: string,
    userId: string,
    expiresAt: Date,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...((user.metadata as any) || {}),
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.set_expiration',
      resource: `User:${userId}`,
      changes: { expiresAt: expiresAt.toISOString() },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Delete user account (soft delete via status)
   */
  async deleteUser(
    adminId: string,
    userId: string,
    reason: string,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.warn(`Admin ${adminId} deleting user ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete - mark as deleted
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...((user.metadata as any) || {}),
          status: UserStatus.DELETED,
          deletedAt: new Date().toISOString(),
          deletedBy: adminId,
          deletedReason: reason,
        },
      },
    });

    // Revoke all sessions
    await this.sessionManagement.revokeAllUserSessions(
      user.tenantId,
      userId,
      adminId,
      'user_deleted',
    );

    // Log admin action
    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.delete',
      resource: `User:${userId}`,
      changes: {
        before: { metadata: user.metadata },
        after: { metadata: updated.metadata },
      },
      reason,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspend(
    adminId: string,
    userIds: string[],
    reason: string,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Admin ${adminId} bulk suspending ${userIds.length} users`);

    let suspended = 0;
    let failed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        await this.suspendUser(adminId, userId, reason, ipAddress, userAgent);
        suspended++;
      } catch (error) {
        failed++;
        errors.push({ userId, error: error.message });
        this.logger.error(`Failed to suspend user ${userId}:`, error);
      }
    }

    // Log bulk action
    const firstUser = await this.prisma.user.findUnique({
      where: { id: userIds[0] },
    });

    if (firstUser) {
      await this.audit.logAction({
        tenantId: firstUser.tenantId,
        adminId,
        action: 'user.bulk_suspend',
        resource: 'User:bulk',
        changes: { userIds, suspended, failed, errors },
        reason,
        ipAddress,
        userAgent,
      });
    }

    return {
      suspended,
      failed,
      errors,
    };
  }

  /**
   * Get all users with filters
   */
  async getUsers(
    tenantId: string,
    filters?: {
      status?: UserStatus;
      role?: string;
      search?: string;
    },
  ) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        ...(filters?.role && { role: filters.role }),
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(tenantId: string) {
    const [total, verified, suspended, deleted] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId, emailVerified: true } }),
      // These would use actual status field when available
      this.prisma.user.count({ where: { tenantId } }), // Placeholder
      this.prisma.user.count({ where: { tenantId } }), // Placeholder
    ]);

    return {
      total,
      verified,
      suspended: 0, // Placeholder
      deleted: 0, // Placeholder
      active: total,
    };
  }
}
