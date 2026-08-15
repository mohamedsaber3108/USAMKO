import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class PromptCacheService {
  private readonly logger = new Logger(PromptCacheService.name);
  private readonly DEFAULT_TTL_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached response for prompt
   */
  async get(prompt: string, modelId?: string): Promise<{
    response: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
  } | null> {
    const hash = this.hashPrompt(prompt, modelId);

    const cached = await this.prisma.promptCache.findUnique({
      where: { hash },
    });

    if (!cached) {
      return null;
    }

    // Check if expired
    const now = new Date();
    if (cached.expiresAt && cached.expiresAt < now) {
      this.logger.debug(`Cache entry expired: ${hash}`);
      // Clean up expired entry
      await this.prisma.promptCache.delete({ where: { hash } });
      return null;
    }

    // Increment hit count
    await this.prisma.promptCache.update({
      where: { hash },
      data: {
        hits: { increment: 1 },
        lastAccessedAt: now,
      },
    });

    this.logger.log(`Cache HIT for prompt hash: ${hash.substring(0, 8)}...`);

    return {
      response: cached.response,
      modelId: cached.modelId,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
    };
  }

  /**
   * Store response in cache
   */
  async set(params: {
    prompt: string;
    modelId: string;
    response: string;
    inputTokens: number;
    outputTokens: number;
    ttlHours?: number;
  }): Promise<void> {
    const hash = this.hashPrompt(params.prompt, params.modelId);
    const now = new Date();
    const ttl = params.ttlHours || this.DEFAULT_TTL_HOURS;
    const expiresAt = new Date(now.getTime() + ttl * 60 * 60 * 1000);

    await this.prisma.promptCache.upsert({
      where: { hash },
      create: {
        hash,
        prompt: params.prompt,
        modelId: params.modelId,
        response: params.response,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        hits: 0,
        expiresAt,
        lastAccessedAt: now,
      },
      update: {
        response: params.response,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        expiresAt,
        lastAccessedAt: now,
      },
    });

    this.logger.log(`Cached response for prompt hash: ${hash.substring(0, 8)}...`);
  }

  /**
   * Clear cache for specific model
   */
  async clearForModel(modelId: string): Promise<number> {
    const result = await this.prisma.promptCache.deleteMany({
      where: { modelId },
    });

    this.logger.log(`Cleared ${result.count} cache entries for model ${modelId}`);
    return result.count;
  }

  /**
   * Clear all expired entries
   */
  async clearExpired(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.promptCache.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    this.logger.log(`Cleared ${result.count} expired cache entries`);
    return result.count;
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<number> {
    const result = await this.prisma.promptCache.deleteMany({});
    this.logger.log(`Cleared all ${result.count} cache entries`);
    return result.count;
  }

  /**
   * Get cache statistics
   */
  async getStatistics() {
    const allEntries = await this.prisma.promptCache.findMany({
      select: {
        hits: true,
        createdAt: true,
        expiresAt: true,
        modelId: true,
      },
    });

    const now = new Date();
    const active = allEntries.filter((e) => !e.expiresAt || e.expiresAt > now);
    const expired = allEntries.filter((e) => e.expiresAt && e.expiresAt <= now);

    const totalHits = allEntries.reduce((sum, e) => sum + e.hits, 0);
    const avgHits = allEntries.length > 0 ? totalHits / allEntries.length : 0;

    // Group by model
    const byModel = new Map<string, number>();
    allEntries.forEach((e) => {
      byModel.set(e.modelId, (byModel.get(e.modelId) || 0) + 1);
    });

    return {
      totalEntries: allEntries.length,
      activeEntries: active.length,
      expiredEntries: expired.length,
      totalHits,
      averageHitsPerEntry: Math.round(avgHits * 10) / 10,
      entriesByModel: Object.fromEntries(byModel),
    };
  }

  /**
   * Get most popular cached prompts
   */
  async getTopCached(limit: number = 10) {
    return this.prisma.promptCache.findMany({
      select: {
        prompt: true,
        modelId: true,
        hits: true,
        createdAt: true,
        lastAccessedAt: true,
      },
      orderBy: { hits: 'desc' },
      take: limit,
    });
  }

  /**
   * Hash prompt to create cache key
   */
  private hashPrompt(prompt: string, modelId?: string): string {
    const content = modelId ? `${prompt}:${modelId}` : prompt;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimate cache savings
   */
  async estimateSavings(period: 'day' | 'week' | 'month' = 'month') {
    const startDate = this.getStartDate(period);

    const cachedEntries = await this.prisma.promptCache.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        model: true,
      },
    });

    let totalSavings = 0;
    let totalRequestsAvoided = 0;

    for (const entry of cachedEntries) {
      if (entry.hits > 0 && entry.model) {
        // Calculate cost for the requests that hit cache
        const costPerRequest =
          ((entry.inputTokens / 1_000_000) * entry.model.costInput) +
          ((entry.outputTokens / 1_000_000) * entry.model.costOutput);

        // First request paid, subsequent hits are free
        const requestsAvoided = entry.hits;
        const savings = costPerRequest * requestsAvoided;

        totalSavings += savings;
        totalRequestsAvoided += requestsAvoided;
      }
    }

    return {
      period,
      totalSavings,
      requestsAvoided: totalRequestsAvoided,
      message: `Saved $${totalSavings.toFixed(2)} by avoiding ${totalRequestsAvoided} API calls via caching`,
    };
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
