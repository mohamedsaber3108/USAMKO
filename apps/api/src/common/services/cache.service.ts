import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Multi-level caching service
 * L1: In-memory Map (1-minute TTL)
 * L2: Redis (configurable TTL)
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // L1 cache - in-memory with Map
  private l1Cache: Map<string, { value: any; expiresAt: number }> = new Map();

  constructor(private readonly redis: Redis) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check L1 cache first
    const l1Value = this.l1Cache.get(key);
    if (l1Value && Date.now() < l1Value.expiresAt) {
      return l1Value.value as T;
    }

    // Check L2 cache (Redis)
    const l2Value = await this.redis.get(key);
    if (l2Value) {
      const value = JSON.parse(l2Value);
      // Update L1 cache
      this.l1Cache.set(key, {
        value,
        expiresAt: Date.now() + 60000, // 1 minute
      });
      return value;
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    // Set in L1 cache (1 minute TTL)
    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + 60000,
    });

    // Set in L2 cache (Redis)
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await this.redis.del(key);
  }

  /**
   * Delete values by tag
   */
  async deleteByTag(tag: string): Promise<void> {
    const keys = await this.redis.keys(`tag:${tag}:*`);
    for (const key of keys) {
      const cacheKey = key.replace(`tag:${tag}:`, '');
      await this.delete(cacheKey);
    }
  }

  /**
   * Clear all L1 cache
   */
  clearL1(): void {
    this.l1Cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      l1Size: this.l1Cache.size,
      l2Keys: 'N/A (requires SCAN)',
    };
  }
}