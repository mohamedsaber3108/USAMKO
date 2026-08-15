import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetPeriod } from '@prisma/client';

@Injectable()
export class BudgetManagerService {
  private readonly logger = new Logger(BudgetManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if budget allows request (throws if exceeded)
   */
  async checkBudget(tenantId: string): Promise<void> {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget || !budget.enabled) {
      // No budget configured = unlimited
      return;
    }

    const spent = await this.getCurrentSpending(tenantId, budget.period);

    if (spent >= budget.limitAmount) {
      throw new BadRequestException(
        `AI budget exceeded. Limit: $${budget.limitAmount}, Spent: $${spent.toFixed(2)}. ` +
        `Budget resets ${this.getResetDate(budget.period).toLocaleDateString()}.`,
      );
    }

    // Check warning threshold
    const percentUsed = (spent / budget.limitAmount) * 100;
    if (percentUsed >= 80 && percentUsed < 100) {
      this.logger.warn(
        `Budget warning for tenant ${tenantId}: ${percentUsed.toFixed(0)}% used ($${spent.toFixed(2)} of $${budget.limitAmount})`,
      );
    }
  }

  /**
   * Get current spending for period
   */
  async getCurrentSpending(tenantId: string, period: BudgetPeriod): Promise<number> {
    const startDate = this.getPeriodStartDate(period);

    const result = await this.prisma.modelUsage.aggregate({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      _sum: {
        costTotal: true,
      },
    });

    return result._sum.costTotal || 0;
  }

  /**
   * Get or create budget for tenant
   */
  async getActiveBudget(tenantId: string) {
    return this.prisma.aIBudget.findFirst({
      where: {
        tenantId,
        enabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Set budget for tenant
   */
  async setBudget(params: {
    tenantId: string;
    limitAmount: number;
    period: BudgetPeriod;
    alertThreshold?: number;
    enabled?: boolean;
  }) {
    // Disable any existing budgets
    await this.prisma.aIBudget.updateMany({
      where: {
        tenantId: params.tenantId,
        enabled: true,
      },
      data: { enabled: false },
    });

    // Create new budget
    return this.prisma.aIBudget.create({
      data: {
        tenantId: params.tenantId,
        limitAmount: params.limitAmount,
        period: params.period,
        alertThreshold: params.alertThreshold || 80,
        enabled: params.enabled !== false,
      },
    });
  }

  /**
   * Update budget
   */
  async updateBudget(budgetId: string, data: {
    limitAmount?: number;
    alertThreshold?: number;
    enabled?: boolean;
  }) {
    return this.prisma.aIBudget.update({
      where: { id: budgetId },
      data,
    });
  }

  /**
   * Disable budget
   */
  async disableBudget(tenantId: string): Promise<number> {
    const result = await this.prisma.aIBudget.updateMany({
      where: {
        tenantId,
        enabled: true,
      },
      data: { enabled: false },
    });

    this.logger.log(`Disabled budgets for tenant ${tenantId}`);
    return result.count;
  }

  /**
   * Get budget status with spending
   */
  async getBudgetStatus(tenantId: string) {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return {
        hasBudget: false,
        unlimited: true,
      };
    }

    const spent = await this.getCurrentSpending(tenantId, budget.period);
    const remaining = Math.max(0, budget.limitAmount - spent);
    const percentUsed = (spent / budget.limitAmount) * 100;

    const status = percentUsed >= 100 ? 'exceeded' :
                   percentUsed >= budget.alertThreshold ? 'warning' :
                   'ok';

    return {
      hasBudget: true,
      unlimited: false,
      budget: {
        id: budget.id,
        limitAmount: budget.limitAmount,
        period: budget.period,
        alertThreshold: budget.alertThreshold,
        enabled: budget.enabled,
      },
      spending: {
        spent,
        remaining,
        percentUsed: Math.round(percentUsed * 10) / 10,
      },
      status,
      resetDate: this.getResetDate(budget.period),
      message: this.getStatusMessage(status, spent, remaining, budget.limitAmount),
    };
  }

  /**
   * Get all budgets for tenant (history)
   */
  async getBudgetHistory(tenantId: string) {
    return this.prisma.aIBudget.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if tenant should receive alert
   */
  async shouldAlert(tenantId: string): Promise<{
    shouldAlert: boolean;
    reason?: string;
    percentUsed?: number;
  }> {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget || !budget.enabled) {
      return { shouldAlert: false };
    }

    const spent = await this.getCurrentSpending(tenantId, budget.period);
    const percentUsed = (spent / budget.limitAmount) * 100;

    if (percentUsed >= 100) {
      return {
        shouldAlert: true,
        reason: 'Budget exceeded',
        percentUsed: Math.round(percentUsed),
      };
    }

    if (percentUsed >= budget.alertThreshold) {
      return {
        shouldAlert: true,
        reason: 'Alert threshold reached',
        percentUsed: Math.round(percentUsed),
      };
    }

    return { shouldAlert: false };
  }

  /**
   * Get budget projections
   */
  async getProjection(tenantId: string) {
    const budget = await this.getActiveBudget(tenantId);

    if (!budget) {
      return null;
    }

    const spent = await this.getCurrentSpending(tenantId, budget.period);
    const periodStart = this.getPeriodStartDate(budget.period);
    const periodEnd = this.getResetDate(budget.period);
    const now = new Date();

    const elapsedMs = now.getTime() - periodStart.getTime();
    const totalPeriodMs = periodEnd.getTime() - periodStart.getTime();
    const percentElapsed = (elapsedMs / totalPeriodMs) * 100;

    const dailyRate = spent / (elapsedMs / (1000 * 60 * 60 * 24));
    const remainingDays = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const projectedTotal = spent + (dailyRate * remainingDays);

    const willExceed = projectedTotal > budget.limitAmount;

    return {
      currentSpent: spent,
      budgetLimit: budget.limitAmount,
      percentElapsed: Math.round(percentElapsed),
      percentSpent: Math.round((spent / budget.limitAmount) * 100),
      dailyAverageRate: Math.round(dailyRate * 100) / 100,
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      projectedRemaining: Math.max(0, budget.limitAmount - projectedTotal),
      willExceed,
      daysRemaining: Math.ceil(remainingDays),
      resetDate: periodEnd,
      warning: willExceed ?
        `At current rate, you will exceed budget by $${(projectedTotal - budget.limitAmount).toFixed(2)}` :
        null,
    };
  }

  /**
   * Helper: Get period start date
   */
  private getPeriodStartDate(period: BudgetPeriod): Date {
    const now = new Date();

    switch (period) {
      case BudgetPeriod.DAILY:
        const daily = new Date(now);
        daily.setHours(0, 0, 0, 0);
        return daily;

      case BudgetPeriod.WEEKLY:
        const weekly = new Date(now);
        weekly.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekly.setHours(0, 0, 0, 0);
        return weekly;

      case BudgetPeriod.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth(), 1);

      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Helper: Get next reset date
   */
  private getResetDate(period: BudgetPeriod): Date {
    const now = new Date();

    switch (period) {
      case BudgetPeriod.DAILY:
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;

      case BudgetPeriod.WEEKLY:
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + (7 - now.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;

      case BudgetPeriod.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);

      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  /**
   * Helper: Get status message
   */
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
