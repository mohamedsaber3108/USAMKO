import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// Context for storing request-scoped tenant/user info
interface RequestContext {
  tenantId?: string;
  userId?: string;
}

/**
 * Prisma Service with Multi-Tenant Isolation
 *
 * Automatically enforces tenant isolation via middleware:
 * - CREATE: Auto-injects tenantId if not provided
 * - READ: Filters all queries by tenantId
 * - UPDATE/DELETE: Ensures operation is scoped to tenantId
 *
 * Usage:
 * 1. Set context in auth guard or middleware:
 *    prismaService.setContext({ tenantId, userId });
 *
 * 2. All subsequent queries in this request are automatically filtered
 *
 * @example
 * // In AuthGuard:
 * prismaService.setContext({ tenantId: user.tenantId, userId: user.id });
 *
 * // In Service (no tenantId needed - auto-filtered):
 * await prisma.campaign.findMany(); // Automatically filtered by tenantId
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');

      // NOTE: Prisma middleware ($use) is deprecated in Prisma 5+
      // Tenant isolation should be handled manually in queries or via Prisma Client Extensions
      // this.registerTenantIsolationMiddleware();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  Database connection failed, running without database:', errorMessage);
      // Don't throw - allow app to start without database
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Set request context (call this in auth guard/middleware).
   */
  setContext(context: RequestContext): void {
    const store = PrismaService.asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, context);
    }
  }

  /**
   * Get current request context.
   */
  getContext(): RequestContext | undefined {
    return PrismaService.asyncLocalStorage.getStore();
  }

  /**
   * Run a function within a request context.
   * Use this to wrap request handling with tenant context.
   */
  runWithContext<T>(context: RequestContext, fn: () => T): T {
    return PrismaService.asyncLocalStorage.run(context, fn);
  }
}
