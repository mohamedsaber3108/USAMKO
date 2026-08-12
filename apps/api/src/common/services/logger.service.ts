import { Injectable, Logger } from '@nestjs/common';

/**
 * Structured logging service using NestJS built-in Logger
 */
@Injectable()
export class LoggerService {
  private readonly logger = new Logger('App');

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context);
  }

  request(message: string, duration?: number, context?: string): void {
    this.logger.log(`${message} ${duration ? `(${duration}ms)` : ''}`, context);
  }
}
