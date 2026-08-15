import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { DataSourceResult } from './orchestrator.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor(private readonly prisma: PrismaService) {}

  async get(key: {
    sourceSlug: string;
    operation: string;
    parameters: any;
  }): Promise<DataSourceResult | null> {
    const cacheKey = this.hashKey(key);

    const cached = await this.prisma.dataCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      return null;
    }

    const now = new Date();
    if (cached.expiresAt && cached.expiresAt < now) {
      this.logger.debug(`Cache entry expired: ${cacheKey.substring(0, 8)}...`);
      await this.prisma.dataCache.delete({ where: { cacheKey } });
      return null;
    }

    await this.prisma.dataCache.update({
      where: { cacheKey },
      data: {
        hitCount: { increment: 1 },
        lastUsedAt: now,
      },
    });

    this.logger.log(`Cache HIT for ${key.sourceSlug}:${key.operation}`);

    return cached.data as any;
  }

  async set(params: {
    key: {
      sourceSlug: string;
      operation: string;
      parameters: any;
    };
    result: DataSourceResult;
    ttl?: number;
  }): Promise<void> {
    const cacheKey = this.hashKey(params.key);
    const now = new Date();
    const ttl = params.ttl || this.DEFAULT_TTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const recordCount = Array.isArray((params.result as any)?.records)
      ? (params.result as any).records.length
      : 0;

    await this.prisma.dataCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        sourceSlug: params.key.sourceSlug,
        operation: params.key.operation,
        parameters: params.key.parameters as any,
        data: params.result as any,
        recordCount,
        expiresAt,
        hitCount: 0,
      },
      update: {
        data: params.result as any,
        recordCount,
        expiresAt,
        lastUsedAt: now,
      },
    });

    this.logger.log(
      `Cached result for ${params.key.sourceSlug}:${params.key.operation}`,
    );
  }

  async clearForSource(sourceSlug: string): Promise<number> {
    const result = await this.prisma.dataCache.deleteMany({
      where: { sourceSlug },
    });

    this.logger.log(
      `Cleared ${result.count} cache entries for source ${sourceSlug}`,
    );
    return result.count;
  }

  async clearExpired(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.dataCache.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    this.logger.log(`Cleared ${result.count} expired cache entries`);
    return result.count;
  }

  async clearAll(): Promise<number> {
    const result = await this.prisma.dataCache.deleteMany({});
    this.logger.log(`Cleared all ${result.count} cache entries`);
    return result.count;
  }

  async getStatistics() {
    const allEntries = await this.prisma.dataCache.findMany({
      select: {
        hitCount: true,
        sourceSlug: true,
        operation: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const now = new Date();
    const active = allEntries.filter(
      (e) => !e.expiresAt || e.expiresAt > now,
    );
    const expired = allEntries.filter(
      (e) => e.expiresAt && e.expiresAt <= now,
    );

    const totalHits = allEntries.reduce((sum, e) => sum + e.hitCount, 0);
    const avgHits =
      allEntries.length > 0 ? totalHits / allEntries.length : 0;

    const bySource = new Map<string, number>();
    allEntries.forEach((e) => {
      bySource.set(e.sourceSlug, (bySource.get(e.sourceSlug) || 0) + 1);
    });

    const byOperation = new Map<string, number>();
    allEntries.forEach((e) => {
      byOperation.set(e.operation, (byOperation.get(e.operation) || 0) + 1);
    });

    return {
      totalEntries: allEntries.length,
      activeEntries: active.length,
      expiredEntries: expired.length,
      totalHits,
      averageHitsPerEntry: Math.round(avgHits * 10) / 10,
      entriesBySource: Object.fromEntries(bySource),
      entriesByOperation: Object.fromEntries(byOperation),
    };
  }

  async getTopCached(limit: number = 10) {
    return this.prisma.dataCache.findMany({
      select: {
        sourceSlug: true,
        operation: true,
        parameters: true,
        hitCount: true,
        createdAt: true,
      },
      orderBy: { hitCount: 'desc' },
      take: limit,
    });
  }

  private hashKey(key: {
    sourceSlug: string;
    operation: string;
    parameters: any;
  }): string {
    const content = JSON.stringify(key);
    return createHash('sha256').update(content).digest('hex');
  }

  async estimateHitRate(
    period: 'day' | 'week' | 'month' = 'month',
  ): Promise<{
    totalQueries: number;
    cacheHits: number;
    hitRate: number;
  }> {
    const startDate = this.getStartDate(period);

    const totalQueries = await this.prisma.dataQuery.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const cacheEntries = await this.prisma.dataCache.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { hitCount: true },
    });

    const cacheHits = cacheEntries.reduce((sum, e) => sum + e.hitCount, 0);

    const hitRate =
      totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    return {
      totalQueries,
      cacheHits,
      hitRate: Math.round(hitRate * 10) / 10,
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
