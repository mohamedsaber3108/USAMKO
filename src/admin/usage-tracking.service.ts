import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format, endOfMonth } from 'date-fns';

export enum ResourceType {
  LEADS = 'leads',
  CAMPAIGNS = 'campaigns',
  PLATFORM_ACCOUNTS = 'platform_accounts',
  AI_TOKENS = 'ai_tokens',
  STORAGE = 'storage',
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track resource usage and check limits
   */
  async trackUsage(
    userId: string,
    resource: ResourceType,
    amount: number = 1,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number | null;
    percentUsed: number;
  }> {
    const month = format(new Date(), 'yyyy-MM');

    // Get or create usage record
    let usage = await this.prisma.userUsage.findUnique({
      where: { userId_month: { userId, month } },
    });

    if (!usage) {
      usage = await this.prisma.userUsage.create({
        data: {
          userId,
          month,
          resetAt: endOfMonth(new Date()),
        },
      });
    }

    // Get limits
    const limits = await this.prisma.usageLimits.findUnique({
      where: { userId },
    });

    // Get current usage and limit for this resource
    const current = this.getResourceUsage(usage, resource);
    const limit = this.getLimit(limits, resource);

    // No limit set = unlimited
    if (limit === null || limit === undefined) {
      await this.incrementUsage(userId, month, resource, amount);
      return {
        allowed: true,
        remaining: Infinity,
        limit: null,
        percentUsed: 0,
      };
    }

    // Check if within limit
    const allowed = current + amount <= limit;
    const remaining = Math.max(0, limit - current - amount);
    const percentUsed = ((current + amount) / limit) * 100;

    if (allowed) {
      await this.incrementUsage(userId, month, resource, amount);

      // Send warning if near limit
      if (limits?.alertAt && percentUsed >= limits.alertAt) {
        await this.sendLimitWarning(userId, resource, remaining, limit);
      }
    }

    return {
      allowed,
      remaining,
      limit,
      percentUsed: Math.round(percentUsed),
    };
  }

  /**
   * Set usage limits for user
   */
  async setLimits(
    userId: string,
    limits: {
      leadsPerMonth?: number | null;
      campaignsPerMonth?: number | null;
      platformAccountsMax?: number | null;
      aiTokensPerMonth?: number | null;
      storageGB?: number | null;
      alertAt?: number;
    },
  ) {
    return this.prisma.usageLimits.upsert({
      where: { userId },
      update: limits,
      create: {
        userId,
        ...limits,
      },
    });
  }

  /**
   * Get user limits
   */
  async getLimits(userId: string) {
    return this.prisma.usageLimits.findUnique({
      where: { userId },
    });
  }

  /**
   * Get current usage for user
   */
  async getCurrentUsage(userId: string, month?: string) {
    const currentMonth = month || format(new Date(), 'yyyy-MM');

    return this.prisma.userUsage.findUnique({
      where: { userId_month: { userId, month: currentMonth } },
    });
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(userId: string) {
    const month = format(new Date(), 'yyyy-MM');
    const [usage, limits] = await Promise.all([
      this.getCurrentUsage(userId, month),
      this.getLimits(userId),
    ]);

    if (!usage) {
      return {
        leads: { used: 0, limit: limits?.leadsPerMonth, percentUsed: 0 },
        campaigns: { used: 0, limit: limits?.campaignsPerMonth, percentUsed: 0 },
        platformAccounts: {
          used: 0,
          limit: limits?.platformAccountsMax,
          percentUsed: 0,
        },
        aiTokens: { used: 0, limit: limits?.aiTokensPerMonth, percentUsed: 0 },
        storage: { used: 0, limit: limits?.storageGB, percentUsed: 0 },
      };
    }

    const calculatePercent = (used: number, limit: number | null | undefined) => {
      if (!limit) return 0;
      return Math.round((used / limit) * 100);
    };

    return {
      leads: {
        used: usage.leadsCollected,
        limit: limits?.leadsPerMonth,
        percentUsed: calculatePercent(usage.leadsCollected, limits?.leadsPerMonth),
      },
      campaigns: {
        used: usage.campaignsRun,
        limit: limits?.campaignsPerMonth,
        percentUsed: calculatePercent(usage.campaignsRun, limits?.campaignsPerMonth),
      },
      platformAccounts: {
        used: usage.platformAccountsUsed,
        limit: limits?.platformAccountsMax,
        percentUsed: calculatePercent(
          usage.platformAccountsUsed,
          limits?.platformAccountsMax,
        ),
      },
      aiTokens: {
        used: usage.aiTokensUsed,
        limit: limits?.aiTokensPerMonth,
        percentUsed: calculatePercent(usage.aiTokensUsed, limits?.aiTokensPerMonth),
      },
      storage: {
        used: usage.storageUsedGB,
        limit: limits?.storageGB,
        percentUsed: calculatePercent(usage.storageUsedGB, limits?.storageGB),
      },
    };
  }

  /**
   * Get usage history for user
   */
  async getUsageHistory(userId: string, months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return this.prisma.userUsage.findMany({
      where: {
        userId,
        resetAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        month: 'asc',
      },
    });
  }

  /**
   * Reset monthly usage (cron job)
   */
  async resetMonthlyUsage(): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = format(lastMonth, 'yyyy-MM');

    // Delete old usage records
    const result = await this.prisma.userUsage.deleteMany({
      where: {
        month: lastMonthStr,
      },
    });

    this.logger.log(`Reset ${result.count} usage records from last month`);
    return result.count;
  }

  /**
   * Get users near limits
   */
  async getUsersNearLimits(threshold: number = 80) {
    const month = format(new Date(), 'yyyy-MM');

    const usageRecords = await this.prisma.userUsage.findMany({
      where: { month },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const usersNearLimits = [];

    for (const usage of usageRecords) {
      const limits = await this.getLimits(usage.userId);
      if (!limits) continue;

      const checks = [
        {
          resource: 'leads',
          used: usage.leadsCollected,
          limit: limits.leadsPerMonth,
        },
        {
          resource: 'campaigns',
          used: usage.campaignsRun,
          limit: limits.campaignsPerMonth,
        },
        {
          resource: 'aiTokens',
          used: usage.aiTokensUsed,
          limit: limits.aiTokensPerMonth,
        },
      ];

      for (const check of checks) {
        if (check.limit && (check.used / check.limit) * 100 >= threshold) {
          usersNearLimits.push({
            user: usage.user,
            resource: check.resource,
            used: check.used,
            limit: check.limit,
            percentUsed: Math.round((check.used / check.limit) * 100),
          });
        }
      }
    }

    return usersNearLimits;
  }

  /**
   * Helper: Get current usage value for a specific resource
   */
  private getResourceUsage(usage: any, resource: ResourceType): number {
    switch (resource) {
      case ResourceType.LEADS:
        return usage.leadsCollected || 0;
      case ResourceType.CAMPAIGNS:
        return usage.campaignsRun || 0;
      case ResourceType.PLATFORM_ACCOUNTS:
        return usage.platformAccountsUsed || 0;
      case ResourceType.AI_TOKENS:
        return usage.aiTokensUsed || 0;
      case ResourceType.STORAGE:
        return usage.storageUsedGB || 0;
    }
  }

  /**
   * Helper: Get limit for resource
   */
  private getLimit(limits: any, resource: ResourceType): number | null {
    if (!limits) return null;

    switch (resource) {
      case ResourceType.LEADS:
        return limits.leadsPerMonth;
      case ResourceType.CAMPAIGNS:
        return limits.campaignsPerMonth;
      case ResourceType.PLATFORM_ACCOUNTS:
        return limits.platformAccountsMax;
      case ResourceType.AI_TOKENS:
        return limits.aiTokensPerMonth;
      case ResourceType.STORAGE:
        return limits.storageGB;
    }
  }

  /**
   * Helper: Increment usage
   */
  private async incrementUsage(
    userId: string,
    month: string,
    resource: ResourceType,
    amount: number,
  ): Promise<void> {
    const field = this.getUsageField(resource);

    await this.prisma.userUsage.update({
      where: { userId_month: { userId, month } },
      data: {
        [field]: { increment: amount },
      },
    });
  }

  /**
   * Helper: Get usage field name
   */
  private getUsageField(resource: ResourceType): string {
    switch (resource) {
      case ResourceType.LEADS:
        return 'leadsCollected';
      case ResourceType.CAMPAIGNS:
        return 'campaignsRun';
      case ResourceType.PLATFORM_ACCOUNTS:
        return 'platformAccountsUsed';
      case ResourceType.AI_TOKENS:
        return 'aiTokensUsed';
      case ResourceType.STORAGE:
        return 'storageUsedGB';
    }
  }

  /**
   * Send limit warning (placeholder - integrate with notification system)
   */
  private async sendLimitWarning(
    userId: string,
    resource: ResourceType,
    remaining: number,
    limit: number,
  ): Promise<void> {
    this.logger.warn(
      `User ${userId} is near limit for ${resource}: ${remaining}/${limit} remaining`,
    );

    // TODO: Integrate with notification system
    // await this.notificationService.send(userId, {
    //   type: 'usage_warning',
    //   resource,
    //   remaining,
    //   limit,
    // });
  }
}
