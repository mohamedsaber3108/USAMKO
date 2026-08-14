import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

/**
 * Audit Logging Interceptor
 *
 * Automatically logs all HTTP mutations (POST, PUT, PATCH, DELETE) to the audit log.
 * Captures request metadata: action, user, tenant, IP address, user agent, duration.
 *
 * Usage:
 * - Apply globally in main.ts: `app.useGlobalInterceptors(new AuditInterceptor(auditService))`
 * - Or apply to specific controllers: `@UseInterceptors(AuditInterceptor)`
 *
 * @example
 * // POST /campaigns → Logged as "POST /campaigns"
 * // DELETE /platforms/123 → Logged as "DELETE /platforms/123"
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations (not GET/HEAD/OPTIONS)
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!shouldAudit) {
      return next.handle();
    }

    const startTime = Date.now();
    const url = request.url;
    const action = `${method} ${url}`;

    // Extract user and tenant from request (set by auth guard)
    const userId = request.user?.id || request.user?.sub;
    const tenantId = request.user?.tenantId || request.tenant?.id;

    // Extract IP address
    const ipAddress =
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress;

    // Extract user agent
    const userAgent = request.headers['user-agent'];

    // Extract entity information from route params or body
    const entity = this.extractEntity(request);
    const entityId = request.params?.id || null;

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Success - log the audit entry
          const duration = Date.now() - startTime;

          this.auditService.log({
            userId,
            tenantId,
            action,
            entity,
            entityId,
            changes: this.extractChanges(request, method),
            success: true,
            ipAddress,
            userAgent,
            duration,
          });
        },
        error: (error) => {
          // Error - log the failure
          const duration = Date.now() - startTime;

          this.auditService.log({
            userId,
            tenantId,
            action,
            entity,
            entityId,
            changes: this.extractChanges(request, method),
            error: error.message || error.toString(),
            success: false,
            ipAddress,
            userAgent,
            duration,
          });
        },
      }),
    );
  }

  /**
   * Extract entity name from request path.
   * Examples:
   * - /campaigns → Campaign
   * - /platforms/123 → Platform
   * - /workflows/456/executions → WorkflowExecution
   */
  private extractEntity(request: any): string | undefined {
    const path = request.route?.path || request.url;

    if (!path) return undefined;

    // Extract first path segment after leading slash
    const match = path.match(/^\/([^\/\?]+)/);
    if (!match) return undefined;

    const segment = match[1];

    // Convert plural to singular and capitalize
    // campaigns → Campaign
    // platforms → Platform
    let entity = segment.replace(/s$/, ''); // Remove trailing 's'
    entity = entity.charAt(0).toUpperCase() + entity.slice(1);

    return entity;
  }

  /**
   * Extract relevant changes from request body.
   * For POST/PUT/PATCH: use request body
   * For DELETE: no changes needed
   */
  private extractChanges(
    request: any,
    method: string,
  ): Record<string, any> | undefined {
    if (method === 'DELETE') {
      // No changes for DELETE operations
      return undefined;
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // Return request body (will be sanitized by AuditService)
      return request.body || undefined;
    }

    return undefined;
  }
}
