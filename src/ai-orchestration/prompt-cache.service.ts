import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class PromptCacheService {
  private readonly logger = new Logger(PromptCacheService.name);
  private readonly DEFAULT_TTL_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  async get(prompt: string, modelId?: string): Promise<{
    response: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
  } | null> {
    const cacheKey = this.hashPrompt(prompt, modelId);

    const cached = await this.prisma.promptCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      return null;
    }

    const now = new Date();
    if (cached.expiresAt && cached.expiresAt < now) {
      this.logger.debug(`Cache entry expired: ${cacheKey}`);
      await this.prisma.promptCache.delete({ where: { cacheKey } });
      return null;
    }

    await this.prisma.promptCache.update({
      where: { cacheKey },
      data: {
        hitCount: { increment: 1 },
        lastUsedAt: now,
      },
    });

    this.logger.log(`Cache HIT for prompt hash: ${cacheKey.substring(0, 8)}...`);

    return {
      response: cached.response,
      modelId: cached.modelId,
      inputTokens: cached.inputTokens,
      outputTokens: cached.outputTokens,
    };
  }

  async set(params: {
    prompt: string;
    modelId: string;
    response: string;
    inputTokens: number;
    outputTokens: number;
    ttlHours?: number;
  }): Promise<void> {
    const cacheKey = this.hashPrompt(params.prompt, params.modelId);
    const now = new Date();
    const ttl = params.ttlHours || this.DEFAULT_TTL_HOURS;
    const expiresAt = new Date(now.getTime() + ttl * 60 * 60 * 1000);

    await this.prisma.promptCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        prompt: params.prompt,
        modelId: params.modelId,
        response: params.response,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        savedCost: 0,
        hitCount: 0,
        expiresAt,
        lastUsedAt: now,
      },
      update: {
        response: params.response,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        expiresAt,
        lastUsedAt: now,
      },
    });

    this.logger.log(`Cached response for prompt hash: ${cacheKey.substring(0, 8)}...`);
  }

  async clearForModel(modelId: string): Promise<number> {
    const result = await this.prisma.promptCache.deleteMany({
      where: { modelId },
    });

    this.logger.log(`Cleared ${result.count} cache entries for model ${modelId}`);
    return result.count;
  }

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

  async clearAll(): Promise<number> {
    const result = await this.prisma.promptCache.deleteMany({});
    this.logger.log(`Cleared all ${result.count} cache entries`);
    return result.count;
  }

  async getStatistics() {
    const allEntries = await this.prisma.promptCache.findMany({
      select: {
        hitCount: true,
        createdAt: true,
        expiresAt: true,
        modelId: true,
      },
    });

    const now = new Date();
    const active = allEntries.filter((e) => !e.expiresAt || e.expiresAt > now);
    const expired = allEntries.filter((e) => e.expiresAt && e.expiresAt <= now);

    const totalHits = allEntries.reduce((sum, e) => sum + e.hitCount, 0);
    const avgHits = allEntries.length > 0 ? totalHits / allEntries.length : 0;

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

  async getTopCached(limit: number = 10) {
    return this.prisma.promptCache.findMany({
      select: {
        prompt: true,
        modelId: true,
        hitCount: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { hitCount: 'desc' },
      take: limit,
    });
  }

  private hashPrompt(prompt: string, modelId?: string): string {
    const content = modelId ? `${prompt}:${modelId}` : prompt;
    return createHash('sha256').update(content).digest('hex');
  }

  async estimateSavings(period: 'day' | 'week' | 'month' = 'month') {
    const startDate = this.getStartDate(period);

    const cachedEntries = await this.prisma.promptCache.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    let totalSavings = 0;
    let totalRequestsAvoided = 0;

    for (const entry of cachedEntries) {
      if (entry.hitCount > 0) {
        totalSavings += entry.savedCost * entry.hitCount;
        totalRequestsAvoided += entry.hitCount;
      }
    }

    return {
      period,
      totalSavings,
      requestsAvoided: totalRequestsAvoided,
      message: `Saved $${totalSavings.toFixed(2)} by avoiding ${totalRequestsAvoided} API calls via caching`,
    };
  }

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
