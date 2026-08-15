import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';

export interface CreateRoleDto {
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  featureAccess: Record<string, boolean>;
  platformAccess: string[];
  priority?: number;
}

@Injectable()
export class RoleManagementService {
  private readonly logger = new Logger(RoleManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Initialize default roles for a tenant
   */
  async initializeDefaultRoles(tenantId: string): Promise<Role[]> {
    this.logger.log(`Initializing default roles for tenant ${tenantId}`);

    const defaultRoles = [
      {
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Full system access',
        permissions: ['*'],
        featureAccess: { '*': true },
        platformAccess: ['*'],
        priority: 100,
        isSystem: true,
        isDefault: false,
      },
      {
        name: 'Admin',
        slug: 'admin',
        description: 'Administrator access',
        permissions: [
          'user.*',
          'role.*',
          'campaign.*',
          'lead.*',
          'platform.*',
          'workflow.*',
          'analytics.*',
        ],
        featureAccess: { '*': true },
        platformAccess: ['*'],
        priority: 90,
        isSystem: true,
        isDefault: false,
      },
      {
        name: 'Manager',
        slug: 'manager',
        description: 'Manager access',
        permissions: [
          'user.read',
          'campaign.*',
          'lead.*',
          'platform.read',
          'platform.post',
          'workflow.*',
          'analytics.read',
        ],
        featureAccess: {
          campaigns: true,
          leads: true,
          platforms: true,
          workflows: true,
          analytics: true,
        },
        platformAccess: ['*'],
        priority: 50,
        isSystem: true,
        isDefault: false,
      },
      {
        name: 'User',
        slug: 'user',
        description: 'Standard user access',
        permissions: [
          'campaign.read',
          'campaign.create',
          'lead.read',
          'lead.create',
          'platform.read',
          'platform.post',
          'workflow.read',
          'workflow.execute',
        ],
        featureAccess: {
          campaigns: true,
          leads: true,
          platforms: true,
          workflows: true,
        },
        platformAccess: ['*'],
        priority: 10,
        isSystem: true,
        isDefault: true,
      },
      {
        name: 'Viewer',
        slug: 'viewer',
        description: 'Read-only access',
        permissions: [
          'campaign.read',
          'lead.read',
          'platform.read',
          'workflow.read',
          'analytics.read',
        ],
        featureAccess: {
          campaigns: false,
          leads: false,
          platforms: false,
          workflows: false,
          analytics: true,
        },
        platformAccess: [],
        priority: 1,
        isSystem: true,
        isDefault: false,
      },
    ];

    const roles = await Promise.all(
      defaultRoles.map((role) =>
        this.prisma.role.create({
          data: {
            tenantId,
            ...role,
          },
        }),
      ),
    );

    this.logger.log(`Created ${roles.length} default roles`);
    return roles;
  }

  /**
   * Create custom role
   */
  async createRole(
    tenantId: string,
    adminId: string,
    dto: CreateRoleDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<Role> {
    this.logger.log(`Creating role ${dto.name} for tenant ${tenantId}`);

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        permissions: dto.permissions,
        featureAccess: dto.featureAccess,
        platformAccess: dto.platformAccess,
        priority: dto.priority || 0,
        isSystem: false,
        isDefault: false,
      },
    });

    // Log action
    await this.audit.logAction({
      tenantId,
      adminId,
      action: 'role.create',
      resource: `Role:${role.id}`,
      changes: { created: role },
      ipAddress,
      userAgent,
    });

    return role;
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    adminId: string,
    updates: Partial<CreateRoleDto>,
    ipAddress: string,
    userAgent: string,
  ): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existing) {
      throw new Error('Role not found');
    }

    if (existing.isSystem) {
      throw new Error('Cannot modify system roles');
    }

    const updated = await this.prisma.role.update({
      where: { id: roleId },
      data: updates,
    });

    // Log action
    await this.audit.logAction({
      tenantId: existing.tenantId,
      adminId,
      action: 'role.update',
      resource: `Role:${roleId}`,
      changes: { before: existing, after: updated },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Delete role
   */
  async deleteRole(
    roleId: string,
    adminId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Check if role is assigned to users
    const usersWithRole = await this.prisma.userRole.count({
      where: { roleId },
    });

    if (usersWithRole > 0) {
      throw new Error(
        `Cannot delete role. It is assigned to ${usersWithRole} users.`,
      );
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    // Log action
    await this.audit.logAction({
      tenantId: role.tenantId,
      adminId,
      action: 'role.delete',
      resource: `Role:${roleId}`,
      changes: { deleted: role },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    adminId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user || !role) {
      throw new Error('User or role not found');
    }

    // Check if already assigned
    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (existing) {
      return existing;
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: adminId,
      },
    });

    // Log action
    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.assign_role',
      resource: `User:${userId}`,
      changes: {
        roleId,
        roleName: role.name,
      },
      ipAddress,
      userAgent,
    });

    return userRole;
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: string,
    roleId: string,
    adminId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    // Log action
    await this.audit.logAction({
      tenantId: user.tenantId,
      adminId,
      action: 'user.remove_role',
      resource: `User:${userId}`,
      changes: { roleId },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get all roles for tenant
   */
  async getRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { priority: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  /**
   * Get roles for user
   */
  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });

    return userRoles.map((ur) => ur.role);
  }

  /**
   * Get default role for tenant
   */
  async getDefaultRole(tenantId: string): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: {
        tenantId,
        isDefault: true,
      },
    });
  }

  /**
   * Check if user has permission
   */
  async userHasPermission(
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const roles = await this.getUserRoles(userId);

    // Check for wildcard permission
    if (roles.some((r) => r.permissions.includes('*'))) {
      return true;
    }

    // Check for exact permission
    if (roles.some((r) => r.permissions.includes(permission))) {
      return true;
    }

    // Check for wildcard category (e.g., "user.*")
    const [category] = permission.split('.');
    if (roles.some((r) => r.permissions.includes(`${category}.*`))) {
      return true;
    }

    return false;
  }
}
