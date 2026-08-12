import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Request timing middleware
 * Logs request duration and performance metrics
 */
@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestTimingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // Track response time
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const duration = Date.now() - startTime;

      // Log request with timing
      this.logger.log(
        JSON.stringify({
          method,
          url: originalUrl,
          statusCode,
          contentLength,
          duration: `${duration}ms`,
          userAgent,
          timestamp: new Date().toISOString(),
        }),
      );

      // Add timing header to response
      res.setHeader('X-Response-Time', `${duration}ms`);
    });

    // Track slow queries (> 1 second)
    const slowQueryThreshold = 1000; // 1 second
    const checkSlowQuery = () => {
      const currentDuration = Date.now() - startTime;
      if (currentDuration > slowQueryThreshold) {
        this.logger.warn(
          JSON.stringify({
            type: 'SLOW_QUERY',
            method,
            url: originalUrl,
            duration: `${currentDuration}ms`,
            threshold: `${slowQueryThreshold}ms`,
            timestamp: new Date().toISOString(),
          }),
        );
      }
    };

    // Check for slow queries periodically
    const interval = setInterval(checkSlowQuery, 500);

    res.on('finish', () => {
      clearInterval(interval);
    });

    next();
  }
}