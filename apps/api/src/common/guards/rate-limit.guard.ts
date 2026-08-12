import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Redis } from 'ioredis';

/**
 * Rate limiting guard using Redis token bucket algorithm
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip || request.connection.remoteAddress || 'unknown';
    const path = request.path;
    const method = request.method;

    // Generate unique key for rate limiting
    const key = `ratelimit:${clientIp}:${path}:${method}`;

    // Get rate limit configuration
    const config = this.getRateLimitConfig(path, method);

    // Check current usage
    const current = await this.redis.get(key);
    const currentCount = parseInt(current || '0', 10);

    if (currentCount >= config.maxRequests) {
      throw new ForbiddenException({
        message: 'Rate limit exceeded',
        retryAfter: await this.redis.ttl(key),
      });
    }

    // Increment counter
    await this.redis.incr(key);
    await this.redis.expire(key, config.windowSeconds);

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', config.maxRequests);
    response.setHeader('X-RateLimit-Remaining', config.maxRequests - currentCount - 1);
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowSeconds * 1000).toISOString());

    return true;
  }

  private getRateLimitConfig(path: string, method: string) {
    // Default limits
    const defaultLimits = {
      free: { maxRequests: 100, windowSeconds: 3600 }, // 100/hour
      pro: { maxRequests: 1000, windowSeconds: 3600 }, // 1000/hour
      enterprise: { maxRequests: 10000, windowSeconds: 3600 }, // 10000/hour
    };

    // Path-based overrides
    const pathConfigs: Record<string, typeof defaultLimits.free> = {
      '/auth/login': { maxRequests: 5, windowSeconds: 300 }, // 5/5min for login
      '/auth/register': { maxRequests: 3, windowSeconds: 3600 }, // 3/hour for register
    };

    // Check for path-specific config
    for (const [pathPattern, config] of Object.entries(pathConfigs)) {
      if (path.includes(pathPattern)) {
        return config;
      }
    }

    // Default to free tier
    return defaultLimits.free;
  }
}