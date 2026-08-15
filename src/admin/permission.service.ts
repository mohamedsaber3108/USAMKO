import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '@prisma/client';

/**
 * Complete permission registry
 */
export const PERMISSIONS = {
  // User Management
  'user.read': { name: 'View users', category: 'users' },
  'user.create': { name: 'Create users', category: 'users' },
  'user.update': { name: 'Update user details', category: 'users' },
  'user.delete': { name: 'Delete users', category: 'users' },
  'user.suspend': { name: 'Suspend user accounts', category: 'users' },
  'user.enable': { name: 'Enable user accounts', category: 'users' },
  'user.assign_role': { name: 'Assign roles to users', category: 'users' },
  'user.grant_permission': { name: 'Grant custom permissions', category: 'users' },
  'user.set_limits': { name: 'Set usage limits', category: 'users' },
  'user.bulk_suspend': { name: 'Bulk suspend users', category: 'users' },
  'user.impersonate': { name: 'Impersonate users', category: 'users' },

  // Role Management
  'role.read': { name: 'View roles', category: 'roles' },
  'role.create': { name: 'Create roles', category: 'roles' },
  'role.update': { name: 'Update roles', category: 'roles' },
  'role.delete': { name: 'Delete roles', category: 'roles' },

  // Campaign Management
  'campaign.read': { name: 'View campaigns', category: 'campaigns' },
  'campaign.create': { name: 'Create campaigns', category: 'campaigns' },
  'campaign.update': { name: 'Update campaigns', category: 'campaigns' },
  'campaign.delete': { name: 'Delete campaigns', category: 'campaigns' },
  'campaign.execute': { name: 'Execute campaigns', category: 'campaigns' },
  'campaign.pause': { name: 'Pause campaigns', category: 'campaigns' },

  // Lead Management
  'lead.read': { name: 'View leads', category: 'leads' },
  'lead.create': { name: 'Create leads', category: 'leads' },
  'lead.update': { name: 'Update leads', category: 'leads' },
  'lead.delete': { name: 'Delete leads', category: 'leads' },
  'lead.collect': { name: 'Collect leads from sources', category: 'leads' },
  'lead.enrich': { name: 'Enrich lead data', category: 'leads' },
  'lead.export': { name: 'Export leads', category: 'leads' },

  // Platform Management
  'platform.read': { name: 'View connected platforms', category: 'platforms' },
  'platform.connect': { name: 'Connect platform accounts', category: 'platforms' },
  'platform.disconnect': { name: 'Disconnect platforms', category: 'platforms' },
  'platform.post': { name: 'Create posts', category: 'platforms' },

  // Workflow Management
  'workflow.read': { name: 'View workflows', category: 'workflows' },
  'workflow.create': { name: 'Create workflows', category: 'workflows' },
  'workflow.update': { name: 'Update workflows', category: 'workflows' },
  'workflow.delete': { name: 'Delete workflows', category: 'workflows' },
  'workflow.execute': { name: 'Execute workflows', category: 'workflows' },

  // Analytics
  'analytics.read': { name: 'View analytics', category: 'analytics' },
  'analytics.export': { name: 'Export analytics', category: 'analytics' },

  // Admin
  'admin.dashboard': { name: 'Access admin dashboard', category: 'admin' },
  'admin.audit': { name: 'View audit trail', category: 'admin' },
  'admin.system_settings': { name: 'Modify system settings', category: 'admin' },

  // Tenant Management
  'tenant.read': { name: 'View tenant details', category: 'tenant' },
  'tenant.update': { name: 'Update tenant settings', category: 'tenant' },
  'tenant.delete': { name: 'Delete tenant', category: 'tenant' },

  // Session Management
  'session.read': { name: 'View sessions', category: 'sessions' },
  'session.revoke': { name: 'Revoke sessions', category: 'sessions' },
} as const;

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize permission registry
   */
  async initializePermissions(): Promise<void> {
    this.logger.log('Initializing permission registry');

    const permissions = Object.entries(PERMISSIONS);

    for (const [key, value] of permissions) {
      await this.prisma.permission.upsert({
        where: { key },
        update: {
          name: value.name,
          category: value.category,
        },
        create: {
          key,
          name: value.name,
          category: value.category,
          isSystem: true,
        },
      });
    }

    this.logger.log(`Initialized ${permissions.length} permissions`);
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get permission categories
   */
  async getCategories(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return permissions.map((p) => p.category);
  }

  /**
   * Check if permission exists
   */
  async permissionExists(key: string): Promise<boolean> {
    const permission = await this.prisma.permission.findUnique({
      where: { key },
    });

    return !!permission;
  }

  /**
   * Create custom permission (for extensions)
   */
  async createPermission(
    key: string,
    name: string,
    category: string,
    description?: string,
  ): Promise<Permission> {
    return this.prisma.permission.create({
      data: {
        key,
        name,
        category,
        description,
        isSystem: false,
      },
    });
  }

  /**
   * Match permission against pattern
   * Supports wildcards: user.* matches user.read, user.write, etc.
   */
  matchPermission(permission: string, pattern: string): boolean {
    // Exact match
    if (permission === pattern) {
      return true;
    }

    // Wildcard match all
    if (pattern === '*') {
      return true;
    }

    // Category wildcard: user.* matches user.read
    if (pattern.endsWith('.*')) {
      const category = pattern.slice(0, -2);
      return permission.startsWith(`${category}.`);
    }

    return false;
  }

  /**
   * Check if permission list includes permission (with wildcard support)
   */
  hasPermission(permissions: string[], required: string): boolean {
    return permissions.some((p) => this.matchPermission(required, p));
  }

  /**
   * Get effective permissions (expand wildcards)
   */
  async getEffectivePermissions(permissions: string[]): Promise<string[]> {
    // If has global wildcard, return all permissions
    if (permissions.includes('*')) {
      const all = await this.getAllPermissions();
      return all.map((p) => p.key);
    }

    const allPermissions = await this.getAllPermissions();
    const effective = new Set<string>();

    for (const permission of permissions) {
      if (permission.endsWith('.*')) {
        // Expand category wildcard
        const category = permission.slice(0, -2);
        const categoryPerms = allPermissions.filter((p) =>
          p.key.startsWith(`${category}.`),
        );
        categoryPerms.forEach((p) => effective.add(p.key));
      } else {
        // Add specific permission
        effective.add(permission);
      }
    }

    return Array.from(effective);
  }

  /**
   * Get permissions grouped by category
   */
  async getPermissionsGrouped(): Promise<
    Record<string, Permission[]>
  > {
    const permissions = await this.getAllPermissions();

    const grouped: Record<string, Permission[]> = {};

    for (const permission of permissions) {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    }

    return grouped;
  }
}
