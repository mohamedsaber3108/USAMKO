import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

const PLATFORM_RATE_LIMITS: Record<string, RateLimitConfig> = {
  facebook: { maxPerMinute: 10, maxPerHour: 200, maxPerDay: 2000 },
  instagram: { maxPerMinute: 10, maxPerHour: 200, maxPerDay: 2000 },
  linkedin: { maxPerMinute: 5, maxPerHour: 100, maxPerDay: 1000 },
  twitter: { maxPerMinute: 15, maxPerHour: 300, maxPerDay: 3000 },
  whatsapp: { maxPerMinute: 60, maxPerHour: 1000, maxPerDay: 10000 },
  telegram: { maxPerMinute: 30, maxPerHour: 500, maxPerDay: 5000 },
};

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly counters: Map<string, { minute: number; hour: number; day: number; lastReset: Date }> = new Map();

  async canSend(platform: string, accountId: string): Promise<boolean> {
    const key = `${platform}:${accountId}`;
    const limits = PLATFORM_RATE_LIMITS[platform] || { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 1000 };

    let counter = this.counters.get(key);
    const now = new Date();

    if (!counter) {
      counter = { minute: 0, hour: 0, day: 0, lastReset: now };
      this.counters.set(key, counter);
    }

    // Reset counters if time windows have passed
    const timeSinceReset = now.getTime() - counter.lastReset.getTime();
    if (timeSinceReset > 86400000) { // 24 hours
      counter.day = 0;
      counter.hour = 0;
      counter.minute = 0;
      counter.lastReset = now;
    } else if (timeSinceReset > 3600000) { // 1 hour
      counter.hour = 0;
      counter.minute = 0;
      counter.lastReset = now;
    } else if (timeSinceReset > 60000) { // 1 minute
      counter.minute = 0;
      counter.lastReset = now;
    }

    // Check if we can send
    if (counter.minute >= limits.maxPerMinute) {
      this.logger.warn(`Rate limit hit for ${key}: minute limit (${limits.maxPerMinute})`);
      return false;
    }
    if (counter.hour >= limits.maxPerHour) {
      this.logger.warn(`Rate limit hit for ${key}: hour limit (${limits.maxPerHour})`);
      return false;
    }
    if (counter.day >= limits.maxPerDay) {
      this.logger.warn(`Rate limit hit for ${key}: day limit (${limits.maxPerDay})`);
      return false;
    }

    return true;
  }

  async recordSend(platform: string, accountId: string): Promise<void> {
    const key = `${platform}:${accountId}`;
    const counter = this.counters.get(key);

    if (counter) {
      counter.minute++;
      counter.hour++;
      counter.day++;
    }
  }

  async getWaitTime(platform: string, accountId: string): Promise<number> {
    const key = `${platform}:${accountId}`;
    const counter = this.counters.get(key);

    if (!counter) return 0;

    const limits = PLATFORM_RATE_LIMITS[platform] || { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 1000 };
    const now = new Date();
    const timeSinceReset = now.getTime() - counter.lastReset.getTime();

    // If minute limit hit, wait until next minute
    if (counter.minute >= limits.maxPerMinute) {
      return 60000 - (timeSinceReset % 60000);
    }

    // If hour limit hit, wait until next hour
    if (counter.hour >= limits.maxPerHour) {
      return 3600000 - (timeSinceReset % 3600000);
    }

    // If day limit hit, wait until next day
    if (counter.day >= limits.maxPerDay) {
      return 86400000 - (timeSinceReset % 86400000);
    }

    return 0;
  }

  getRateLimitStatus(platform: string, accountId: string) {
    const key = `${platform}:${accountId}`;
    const counter = this.counters.get(key);
    const limits = PLATFORM_RATE_LIMITS[platform] || { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 1000 };

    if (!counter) {
      return {
        minute: { used: 0, limit: limits.maxPerMinute, remaining: limits.maxPerMinute },
        hour: { used: 0, limit: limits.maxPerHour, remaining: limits.maxPerHour },
        day: { used: 0, limit: limits.maxPerDay, remaining: limits.maxPerDay },
      };
    }

    return {
      minute: { used: counter.minute, limit: limits.maxPerMinute, remaining: limits.maxPerMinute - counter.minute },
      hour: { used: counter.hour, limit: limits.maxPerHour, remaining: limits.maxPerHour - counter.hour },
      day: { used: counter.day, limit: limits.maxPerDay, remaining: limits.maxPerDay - counter.day },
    };
  }
}
