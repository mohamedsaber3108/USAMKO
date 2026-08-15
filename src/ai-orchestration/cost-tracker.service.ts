import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIModel, ModelUsage, TaskComplexity } from '@prisma/client';

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track model usage and calculate cost
   */
  async trackUsage(params: {
    tenantId: string;
    userId: string;
    model: AIModel;
    taskName?: string;
    taskComplexity?: TaskComplexity;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    qualityScore?: number;
  }): Promise<ModelUsage> {
    // Calculate costs
    const costInput = (params.inputTokens / 1_000_000) * params.model.costInput;
    const costOutput = (params.outputTokens / 1_000_000) * params.model.costOutput;
    const costTotal = costInput + costOutput;

    // Save usage record
    const usage = await this.prisma.modelUsage.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        modelId: params.model.id,
        taskName: params.taskName,
        taskComplexity: params.taskComplexity,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costInput,
        costOutput,
        costTotal,
        latencyMs: params.latencyMs,
        qualityScore: params.qualityScore,
        success: params.success,
        errorMessage: params.errorMessage,
      },
    });

    this.logger.log(
      `Tracked usage: ${params.model.name}, ${params.inputTokens + params.outputTokens} tokens, $${costTotal.toFixed(4)}`,
    );

    return usage;
  }

  /**
   * Get cost analytics for period
   */
  async getCostAnalytics(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'month',
  ) {
    const startDate = this.getStartDate(period);

    const usage = await this.prisma.modelUsage.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      include: {
        model: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Aggregate by model
    const byModel = this.aggregateByKey(usage, 'modelId', (u) => ({
      id: u.model.id,
      name: u.model.name,
      provider: u.model.provider,
    }));

    // Aggregate by task
    const byTask = this.aggregateByKey(usage, 'taskName', (u) => u.taskName || 'unknown');

    // Aggregate by user
    const byUser = this.aggregateByKey(usage, 'userId', (u) => ({
      id: u.user.id,
      name: u.user.name,
    }));

    return {
      period,
      totalCost: usage.reduce((sum, u) => sum + u.costTotal, 0),
      totalTokens: usage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      totalRequests: usage.length,
      successRate: usage.filter((u) => u.success).length / usage.length,
      avgLatencyMs: usage.reduce((sum, u) => sum + u.latencyMs, 0) / usage.length,
      byModel,
      byTask,
      byUser,
    };
  }

  /**
   * Get user spending
   */
  async getUserSpending(userId: string, months: number = 3) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const usage = await this.prisma.modelUsage.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      include: { model: true },
    });

    return {
      totalCost: usage.reduce((sum, u) => sum + u.costTotal, 0),
      totalTokens: usage.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      requestCount: usage.length,
      averageCostPerRequest: usage.length > 0
        ? usage.reduce((sum, u) => sum + u.costTotal, 0) / usage.length
        : 0,
    };
  }

  /**
   * Get cost savings from optimization
   */
  async getCostSavings(tenantId: string, period: 'month' = 'month') {
    const startDate = this.getStartDate(period);

    const usage = await this.prisma.modelUsage.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      include: { model: true },
    });

    // Calculate what it would have cost if using GPT-4 for everything
    const GPT4_INPUT_COST = 10.0;
    const GPT4_OUTPUT_COST = 30.0;

    const totalTokens = usage.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0,
    );

    const wouldHaveCost =
      (usage.reduce((sum, u) => sum + u.inputTokens, 0) / 1_000_000) * GPT4_INPUT_COST +
      (usage.reduce((sum, u) => sum + u.outputTokens, 0) / 1_000_000) * GPT4_OUTPUT_COST;

    const actualCost = usage.reduce((sum, u) => sum + u.costTotal, 0);
    const saved = wouldHaveCost - actualCost;
    const savingsPercent = (saved / wouldHaveCost) * 100;

    return {
      wouldHaveCost,
      actualCost,
      saved,
      savingsPercent: Math.round(savingsPercent),
      message: `Saved $${saved.toFixed(2)} (${savingsPercent.toFixed(0)}%) by using optimized model selection`,
    };
  }

  /**
   * Helper: Aggregate usage by key
   */
  private aggregateByKey(
    usage: any[],
    key: string,
    labelFn: (u: any) => any,
  ) {
    const grouped = new Map<string, any[]>();

    usage.forEach((u) => {
      const keyValue = u[key] || 'unknown';
      if (!grouped.has(keyValue)) {
        grouped.set(keyValue, []);
      }
      grouped.get(keyValue)!.push(u);
    });

    return Array.from(grouped.entries()).map(([keyValue, items]) => {
      const label = labelFn(items[0]);
      return {
        label: typeof label === 'object' ? label : keyValue,
        cost: items.reduce((sum, i) => sum + i.costTotal, 0),
        tokens: items.reduce((sum, i) => sum + i.inputTokens + i.outputTokens, 0),
        requests: items.length,
      };
    });
  }

  /**
   * Helper: Get start date for period
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
}
