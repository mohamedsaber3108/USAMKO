import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { DataSourceResult } from './orchestrator.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached result
   */
  async get(key: {
    sourceSlug: string;
    operation: string;
    parameters: any;
  }): Promise<DataSourceResult | null> {
    const hash = this.hashKey(key);

    const cached = await this.prisma.dataCache.findUnique({
      where: { key: hash },
    });

    if (!cached) {
      return null;
    }

    // Check if expired
    const now = new Date();
    if (cached.expiresAt && cached.expiresAt < now) {
      this.logger.debug(`Cache entry expired: ${hash.substring(0, 8)}...`);
      // Clean up expired entry
      await this.prisma.dataCache.delete({ where: { key: hash } });
      return null;
    }

    // Increment hit count
    await this.prisma.dataCache.update({
      where: { key: hash },
      data: { hits: { increment: 1 } },
    });

    this.logger.log(`Cache HIT for ${key.sourceSlug}:${key.operation}`);

    return cached.result as any;
  }

  /**
   * Set cache entry
   */
  async set(params: {
    key: {
      sourceSlug: string;
      operation: string;
      parameters: any;
    };
    result: DataSourceResult;
    ttl?: number;
  }): Promise<void> {
    const hash = this.hashKey(params.key);
    const now = new Date();
    const ttl = params.ttl || this.DEFAULT_TTL;
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    await this.prisma.dataCache.upsert({
      where: { key: hash },
      create: {
        key: hash,
        sourceSlug: params.key.sourceSlug,
        operation: params.key.operation,
        parameters: params.key.parameters as any,
        result: params.result as any,
        expiresAt,
        hits: 0,
      },
      update: {
        result: params.result as any,
        expiresAt,
      },
    });

    this.logger.log(
      `Cached result for ${params.key.sourceSlug}:${params.key.operation}`,
    );
  }

  /**
   * Clear cache for source
   */
  async clearForSource(sourceSlug: string): Promise<number> {
    const result = await this.prisma.dataCache.deleteMany({
      where: { sourceSlug },
    });

    this.logger.log(
      `Cleared ${result.count} cache entries for source ${sourceSlug}`,
    );
    return result.count;
  }

  /**
   * Clear expired entries
   */
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

  /**
   * Clear all cache
   */
  async clearAll(): Promise<number> {
    const result = await this.prisma.dataCache.deleteMany({});
    this.logger.log(`Cleared all ${result.count} cache entries`);
    return result.count;
  }

  /**
   * Get cache statistics
   */
  async getStatistics() {
    const allEntries = await this.prisma.dataCache.findMany({
      select: {
        hits: true,
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

    const totalHits = allEntries.reduce((sum, e) => sum + e.hits, 0);
    const avgHits =
      allEntries.length > 0 ? totalHits / allEntries.length : 0;

    // Group by source
    const bySource = new Map<string, number>();
    allEntries.forEach((e) => {
      bySource.set(e.sourceSlug, (bySource.get(e.sourceSlug) || 0) + 1);
    });

    // Group by operation
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

  /**
   * Get top cached queries
   */
  async getTopCached(limit: number = 10) {
    return this.prisma.dataCache.findMany({
      select: {
        sourceSlug: true,
        operation: true,
        parameters: true,
        hits: true,
        createdAt: true,
      },
      orderBy: { hits: 'desc' },
      take: limit,
    });
  }

  /**
   * Hash cache key
   */
  private hashKey(key: {
    sourceSlug: string;
    operation: string;
    parameters: any;
  }): string {
    const content = JSON.stringify(key);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimate cache hit rate
   */
  async estimateHitRate(
    period: 'day' | 'week' | 'month' = 'month',
  ): Promise<{
    totalQueries: number;
    cacheHits: number;
    hitRate: number;
  }> {
    const startDate = this.getStartDate(period);

    // Get total queries in period
    const totalQueries = await this.prisma.dataQuery.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Get cache entries created in period
    const cacheEntries = await this.prisma.dataCache.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { hits: true },
    });

    const cacheHits = cacheEntries.reduce((sum, e) => sum + e.hits, 0);

    const hitRate =
      totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    return {
      totalQueries,
      cacheHits,
      hitRate: Math.round(hitRate * 10) / 10,
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
