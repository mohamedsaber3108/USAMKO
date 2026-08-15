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
    const startTime = Date.now();
    const logger = this.logger;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      try {
        logger.log(`${method} ${originalUrl} ${res.statusCode} ${duration}ms`);
      } catch {}
    });

    next();
  }
}