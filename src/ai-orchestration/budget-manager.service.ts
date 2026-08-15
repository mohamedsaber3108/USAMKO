import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetManagerService {
  private readonly logger = new Logger(BudgetManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkBudget(tenantId: string): Promise<void> {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return;
    }

    await this.resetIfNeeded(budget);

    if (budget.monthlyLimit && budget.monthlySpend >= budget.monthlyLimit) {
      throw new BadRequestException(
        `AI budget exceeded. Monthly limit: $${budget.monthlyLimit}, Spent: $${budget.monthlySpend.toFixed(2)}. ` +
        `Resets ${budget.monthlyResetAt.toLocaleDateString()}.`,
      );
    }

    if (budget.dailyLimit && budget.dailySpend >= budget.dailyLimit) {
      throw new BadRequestException(
        `AI daily budget exceeded. Daily limit: $${budget.dailyLimit}, Spent: $${budget.dailySpend.toFixed(2)}. ` +
        `Resets ${budget.dailyResetAt.toLocaleDateString()}.`,
      );
    }

    const limit = budget.monthlyLimit || budget.dailyLimit;
    const spent = budget.monthlyLimit ? budget.monthlySpend : budget.dailySpend;
    if (limit) {
      const percentUsed = spent / limit;
      if (percentUsed >= budget.alertAt && percentUsed < budget.stopAt) {
        this.logger.warn(
          `Budget warning for tenant ${tenantId}: ${(percentUsed * 100).toFixed(0)}% used ($${spent.toFixed(2)} of $${limit})`,
        );
      }
    }
  }

  async getCurrentSpending(tenantId: string, period: 'daily' | 'monthly' = 'monthly'): Promise<number> {
    const budget = await this.getActiveBudget(tenantId);
    if (!budget) return 0;
    return period === 'daily' ? budget.dailySpend : budget.monthlySpend;
  }

  async getActiveBudget(tenantId: string) {
    return this.prisma.aIBudget.findUnique({
      where: { tenantId },
    });
  }

  async setBudget(params: {
    tenantId: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    alertAt?: number;
    stopAt?: number;
  }) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.prisma.aIBudget.upsert({
      where: { tenantId: params.tenantId },
      create: {
        tenantId: params.tenantId,
        dailyLimit: params.dailyLimit || null,
        monthlyLimit: params.monthlyLimit || null,
        alertAt: params.alertAt || 0.8,
        stopAt: params.stopAt || 1.0,
        dailyResetAt: tomorrow,
        monthlyResetAt: nextMonth,
      },
      update: {
        dailyLimit: params.dailyLimit,
        monthlyLimit: params.monthlyLimit,
        ...(params.alertAt !== undefined && { alertAt: params.alertAt }),
        ...(params.stopAt !== undefined && { stopAt: params.stopAt }),
      },
    });
  }

  async updateBudget(budgetId: string, data: {
    dailyLimit?: number;
    monthlyLimit?: number;
    alertAt?: number;
    stopAt?: number;
  }) {
    return this.prisma.aIBudget.update({
      where: { id: budgetId },
      data,
    });
  }

  async disableBudget(tenantId: string): Promise<number> {
    const result = await this.prisma.aIBudget.deleteMany({
      where: { tenantId },
    });

    this.logger.log(`Removed budget for tenant ${tenantId}`);
    return result.count;
  }

  async getBudgetStatus(tenantId: string) {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return {
        hasBudget: false,
        unlimited: true,
      };
    }

    const limit = budget.monthlyLimit || budget.dailyLimit || 0;
    const spent = budget.monthlyLimit ? budget.monthlySpend : budget.dailySpend;
    const remaining = Math.max(0, limit - spent);
    const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

    const status = percentUsed >= (budget.stopAt * 100) ? 'exceeded' :
                   percentUsed >= (budget.alertAt * 100) ? 'warning' :
                   'ok';

    return {
      hasBudget: true,
      unlimited: false,
      budget: {
        id: budget.id,
        dailyLimit: budget.dailyLimit,
        monthlyLimit: budget.monthlyLimit,
        alertAt: budget.alertAt,
        stopAt: budget.stopAt,
      },
      spending: {
        dailySpend: budget.dailySpend,
        monthlySpend: budget.monthlySpend,
        remaining,
        percentUsed: Math.round(percentUsed * 10) / 10,
      },
      status,
      dailyResetDate: budget.dailyResetAt,
      monthlyResetDate: budget.monthlyResetAt,
      message: this.getStatusMessage(status, spent, remaining, limit),
    };
  }

  async getBudgetHistory(tenantId: string) {
    const budget = await this.getActiveBudget(tenantId);
    return budget ? [budget] : [];
  }

  async shouldAlert(tenantId: string): Promise<{
    shouldAlert: boolean;
    reason?: string;
    percentUsed?: number;
  }> {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return { shouldAlert: false };
    }

    const limit = budget.monthlyLimit || budget.dailyLimit || 0;
    const spent = budget.monthlyLimit ? budget.monthlySpend : budget.dailySpend;
    if (limit === 0) return { shouldAlert: false };

    const percentUsed = (spent / limit) * 100;

    if (spent / limit >= budget.stopAt) {
      return {
        shouldAlert: true,
        reason: 'Budget exceeded',
        percentUsed: Math.round(percentUsed),
      };
    }

    if (spent / limit >= budget.alertAt) {
      return {
        shouldAlert: true,
        reason: 'Alert threshold reached',
        percentUsed: Math.round(percentUsed),
      };
    }

    return { shouldAlert: false };
  }

  async getProjection(tenantId: string) {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return null;
    }

    const limit = budget.monthlyLimit || budget.dailyLimit || 0;
    const spent = budget.monthlyLimit ? budget.monthlySpend : budget.dailySpend;
    const resetDate = budget.monthlyLimit ? budget.monthlyResetAt : budget.dailyResetAt;
    const now = new Date();

    const periodStart = budget.monthlyLimit
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const elapsedMs = now.getTime() - periodStart.getTime();
    const totalPeriodMs = resetDate.getTime() - periodStart.getTime();
    const percentElapsed = totalPeriodMs > 0 ? (elapsedMs / totalPeriodMs) * 100 : 0;

    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const dailyRate = elapsedDays > 0 ? spent / elapsedDays : 0;
    const remainingDays = (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const projectedTotal = spent + (dailyRate * remainingDays);

    const willExceed = limit > 0 && projectedTotal > limit;

    return {
      currentSpent: spent,
      budgetLimit: limit,
      percentElapsed: Math.round(percentElapsed),
      percentSpent: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      dailyAverageRate: Math.round(dailyRate * 100) / 100,
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      projectedRemaining: Math.max(0, limit - projectedTotal),
      willExceed,
      daysRemaining: Math.ceil(remainingDays),
      resetDate,
      warning: willExceed
        ? `At current rate, you will exceed budget by $${(projectedTotal - limit).toFixed(2)}`
        : null,
    };
  }

  private async resetIfNeeded(budget: any): Promise<void> {
    const now = new Date();
    const updates: any = {};

    if (now >= budget.dailyResetAt) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      updates.dailySpend = 0;
      updates.dailyResetAt = tomorrow;
    }

    if (now >= budget.monthlyResetAt) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      updates.monthlySpend = 0;
      updates.monthlyResetAt = nextMonth;
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.aIBudget.update({
        where: { id: budget.id },
        data: updates,
      });
      Object.assign(budget, updates);
    }
  }

  private getStatusMessage(
    status: string,
    spent: number,
    remaining: number,
    limit: number,
  ): string {
    switch (status) {
      case 'exceeded':
        return `Budget exceeded! Spent $${spent.toFixed(2)} of $${limit} limit. AI requests are blocked.`;
      case 'warning':
        return `Budget warning: $${remaining.toFixed(2)} remaining of $${limit} limit.`;
      case 'ok':
        return `Budget healthy: $${remaining.toFixed(2)} remaining of $${limit} limit.`;
      default:
        return 'Budget status unknown';
    }
  }
}
