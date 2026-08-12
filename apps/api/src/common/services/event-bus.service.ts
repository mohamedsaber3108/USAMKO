import { Injectable, Logger } from '@nestjs/common';

/**
 * In-process event bus for module communication
 * Uses a simple pub/sub pattern with async handlers
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private events: Map<string, Set<(data: any) => Promise<void> | void>> = new Map();

  /**
   * Emit an event to all subscribers
   */
  async emit<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.events.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    this.logger.debug(`Emitting event: ${event}`);
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(`Error handling event ${event}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: (data: T) => Promise<void> | void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(handler as any);
    this.logger.debug(`Subscribed to event: ${event}`);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(event: string, handler: (data: T) => Promise<void> | void): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler as any);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Get number of subscribers for an event
   */
  subscriberCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.events.clear();
  }
}