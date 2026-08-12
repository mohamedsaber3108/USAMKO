// Tenant service for managing multi-tenancy

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED';
  createdAt: Date;
}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant by ID
   */
  async getById(tenantId: string): Promise<TenantInfo | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: tenant.createdAt,
    };
  }

  /**
   * Get tenant by slug
   */
  async getBySlug(slug: string): Promise<TenantInfo | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: tenant.createdAt,
    };
  }

  /**
   * Get or create default tenant
   * In production, this should be replaced with proper tenant creation flow
   */
  async getDefaultTenant(): Promise<TenantInfo> {
    const defaultTenant = await this.prisma.tenant.findUnique({
      where: { slug: 'default' },
    });

    if (defaultTenant) {
      return {
        id: defaultTenant.id,
        name: defaultTenant.name,
        slug: defaultTenant.slug,
        status: defaultTenant.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
        createdAt: defaultTenant.createdAt,
      };
    }

    // Create default tenant if it doesn't exist
    const tenant = await this.prisma.tenant.create({
      data: {
        id: 'default-tenant-id',
        name: 'Default Tenant',
        slug: 'default',
        status: 'ACTIVE',
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: tenant.createdAt,
    };
  }

  /**
   * Get all active tenants (ADMIN only)
   */
  async getAllActiveTenants(): Promise<TenantInfo[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get tenant users count
   */
  async getUsersCount(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId },
    });
  }

  /**
   * Suspend a tenant (ADMIN only)
   */
  async suspendTenant(tenantId: string): Promise<TenantInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      status: updated.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: updated.createdAt,
    };
  }

  /**
   * Activate a tenant (ADMIN only)
   */
  async activateTenant(tenantId: string): Promise<TenantInfo> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      status: updated.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: updated.createdAt,
    };
  }

  /**
   * Create a new tenant
   * In production, this would be called by admin or during user registration
   */
  async createTenant(name: string, slug: string): Promise<TenantInfo> {
    // Check if slug already exists
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        id: `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        slug,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELED',
      createdAt: tenant.createdAt,
    };
  }
}
