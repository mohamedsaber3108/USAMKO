import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface AuditLogData {
  tenantId?: string;
  userId?: string;
  action: string; // "POST /campaigns", "DELETE /platforms/123"
  entity?: string; // "Campaign", "PlatformAccount"
  entityId?: string;
  changes?: Record<string, any>; // Data being created/updated
  error?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  duration?: number; // Milliseconds
}

/**
 * Audit Logging Service
 *
 * Records all mutations (POST, PUT, PATCH, DELETE) for security and compliance.
 * Automatically redacts sensitive fields before logging.
 *
 * Features:
 * - Automatic mutation tracking
 * - Sensitive field redaction (passwords, tokens, etc.)
 * - IP address and user agent tracking
 * - Request duration tracking
 * - Error logging
 *
 * @example
 * await auditService.log({
 *   userId: 'user_123',
 *   tenantId: 'tenant_456',
 *   action: 'POST /campaigns',
 *   entity: 'Campaign',
 *   entityId: 'campaign_789',
 *   changes: { name: 'New Campaign' },
 *   success: true,
 *   duration: 150
 * });
 */
@Injectable()
export class AuditService {
  // Fields that should NEVER be logged (security-sensitive)
  private readonly SENSITIVE_FIELDS = [
    'password',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'privateKey',
    'private_key',
    'authToken',
    'auth_token',
    'sessionToken',
    'session_token',
    'encryptionKey',
    'encryption_key',
    'masterKey',
    'master_key',
    'credentials',
    'auth',
    'authorization',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit entry.
   * Automatically redacts sensitive fields and handles async storage.
   *
   * @param data - Audit log data
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // Redact sensitive fields from changes
      const sanitizedChanges = data.changes
        ? this.sanitizeData(data.changes)
        : null;

      // Store in database (fire-and-forget for performance)
      // Don't await to avoid blocking the request
      this.prisma.auditLog
        .create({
          data: {
            tenantId: data.tenantId || null,
            userId: data.userId || null,
            action: data.action,
            entity: data.entity || null,
            entityId: data.entityId || null,
            changes: sanitizedChanges,
            error: data.error || null,
            success: data.success,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            duration: data.duration || null,
            timestamp: new Date(),
          },
        })
        .catch((error) => {
          // Don't throw - audit logging should never break the main flow
          console.error('Failed to write audit log:', error.message);
        });
    } catch (error) {
      // Fail silently - audit logging is secondary to main functionality
      console.error('Audit logging error:', error.message);
    }
  }

  /**
   * Recursively redact sensitive fields from an object.
   *
   * @param data - Object to sanitize
   * @returns Sanitized copy with sensitive fields replaced
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: Record<string, any> = {};

    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();

      // Check if this key is sensitive
      const isSensitive = this.SENSITIVE_FIELDS.some((field) =>
        lowerKey.includes(field.toLowerCase()),
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }

    return sanitized;
  }

  /**
   * Query audit logs with filters.
   *
   * @param filters - Query filters
   * @returns Array of audit log entries
   */
  async query(filters: {
    tenantId?: string;
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.success !== undefined) where.success = filters.success;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Get audit log statistics for a tenant.
   *
   * @param tenantId - Tenant identifier
   * @param startDate - Start date for stats
   * @param endDate - End date for stats
   * @returns Statistics object
   */
  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [total, successful, failed, byEntity] = await Promise.all([
      // Total logs
      this.prisma.auditLog.count({ where }),

      // Successful operations
      this.prisma.auditLog.count({
        where: { ...where, success: true },
      }),

      // Failed operations
      this.prisma.auditLog.count({
        where: { ...where, success: false },
      }),

      // Group by entity
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      byEntity: byEntity.map((g) => ({
        entity: g.entity,
        count: g._count,
      })),
    };
  }

  /**
   * Get recent activity for a user.
   *
   * @param userId - User identifier
   * @param limit - Max number of entries to return
   * @returns Recent audit logs
   */
  async getUserActivity(userId: string, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        action: true,
        entity: true,
        entityId: true,
        success: true,
        timestamp: true,
      },
    });
  }

  /**
   * Delete old audit logs (for GDPR compliance / data retention).
   *
   * @param olderThan - Delete logs older than this date
   * @returns Number of logs deleted
   */
  async deleteOldLogs(olderThan: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: olderThan,
        },
      },
    });

    return result.count;
  }

  /**
   * Export audit logs to JSON (for compliance reporting).
   *
   * @param filters - Query filters
   * @returns JSON string of audit logs
   */
  async exportLogs(filters: {
    tenantId?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<string> {
    const logs = await this.query({
      ...filters,
      limit: 10000, // Max export size
    });

    return JSON.stringify(logs, null, 2);
  }
}
