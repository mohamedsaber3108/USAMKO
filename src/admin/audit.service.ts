import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAction } from '@prisma/client';

export interface LogActionParams {
  tenantId: string;
  adminId: string;
  action: string;
  resource: string;
  changes: any;
  reason?: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log admin action to audit trail
   */
  async logAction(params: LogActionParams): Promise<AdminAction> {
    this.logger.log(
      `Audit: ${params.action} on ${params.resource} by admin ${params.adminId}`,
    );

    return this.prisma.adminAction.create({
      data: {
        tenantId: params.tenantId,
        adminId: params.adminId,
        action: params.action,
        resource: params.resource,
        changes: params.changes,
        reason: params.reason,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * Get audit trail for tenant
   */
  async getAuditTrail(
    tenantId: string,
    filters?: {
      adminId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      skip?: number;
      take?: number;
    },
  ) {
    const where: any = { tenantId };

    if (filters?.adminId) {
      where.adminId = filters.adminId;
    }

    if (filters?.action) {
      where.action = { contains: filters.action };
    }

    if (filters?.resource) {
      where.resource = { contains: filters.resource };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: pagination?.skip || 0,
        take: pagination?.take || 50,
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.floor((pagination?.skip || 0) / (pagination?.take || 50)) + 1,
      pageSize: pagination?.take || 50,
      totalPages: Math.ceil(total / (pagination?.take || 50)),
    };
  }

  /**
   * Get audit trail for specific resource
   */
  async getResourceAuditTrail(
    tenantId: string,
    resource: string,
  ): Promise<AdminAction[]> {
    return this.prisma.adminAction.findMany({
      where: {
        tenantId,
        resource,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get recent actions by admin
   */
  async getAdminActions(
    adminId: string,
    limit: number = 50,
  ): Promise<AdminAction[]> {
    return this.prisma.adminAction.findMany({
      where: { adminId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ) {
    const startDate = this.getStartDate(period);

    const [
      totalActions,
      totalAdmins,
      topActions,
      topAdmins,
      actionsByDay,
    ] = await Promise.all([
      // Total actions in period
      this.prisma.adminAction.count({
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
      }),

      // Unique admins
      this.prisma.adminAction.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
        select: { adminId: true },
        distinct: ['adminId'],
      }),

      // Top actions
      this.prisma.adminAction.groupBy({
        by: ['action'],
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
        take: 10,
      }),

      // Most active admins
      this.prisma.adminAction.groupBy({
        by: ['adminId'],
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            adminId: 'desc',
          },
        },
        take: 10,
      }),

      // Actions by day (for charts)
      this.getActionsByDay(tenantId, startDate),
    ]);

    return {
      totalActions,
      totalAdmins: totalAdmins.length,
      topActions: topActions.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      topAdmins: await Promise.all(
        topAdmins.map(async (a) => {
          const admin = await this.prisma.user.findUnique({
            where: { id: a.adminId },
            select: { name: true, email: true },
          });
          return {
            adminId: a.adminId,
            name: admin?.name,
            email: admin?.email,
            count: a._count,
          };
        }),
      ),
      actionsByDay,
    };
  }

  /**
   * Search audit trail
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 50,
  ): Promise<AdminAction[]> {
    return this.prisma.adminAction.findMany({
      where: {
        tenantId,
        OR: [
          { action: { contains: query, mode: 'insensitive' } },
          { resource: { contains: query, mode: 'insensitive' } },
          { reason: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get actions by day for charts
   */
  private async getActionsByDay(tenantId: string, startDate: Date) {
    // This is a simplified version - in production, use raw SQL for better performance
    const actions = await this.prisma.adminAction.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by day
    const grouped = new Map<string, number>();
    actions.forEach((action) => {
      const day = action.createdAt.toISOString().split('T')[0];
      grouped.set(day, (grouped.get(day) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([day, count]) => ({
      day,
      count,
    }));
  }

  /**
   * Get start date for period
   */
  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * Cleanup old audit logs (keep last N months)
   */
  async cleanupOldLogs(months: number = 12): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const result = await this.prisma.adminAction.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} audit logs older than ${months} months`);
    return result.count;
  }
}
