import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Session } from '@prisma/client';

@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new user session
   */
  async createSession(
    userId: string,
    token: string,
    data: {
      ipAddress: string;
      userAgent: string;
      deviceType?: string;
      deviceName?: string;
      location?: string;
    },
  ): Promise<Session> {
    // Expire existing sessions if too many (keep last 5)
    await this.cleanupOldSessions(userId, 5);

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.session.create({
      data: {
        userId,
        token,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        deviceType: data.deviceType,
        deviceName: data.deviceName,
        location: data.location,
        expiresAt,
      },
    });
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });
  }

  /**
   * Update session last active time
   */
  async updateLastActive(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  /**
   * Revoke specific session
   */
  async revokeSession(
    sessionId: string,
    revokedBy: string,
    reason: string,
  ): Promise<Session> {
    this.logger.log(`Revoking session ${sessionId}, reason: ${reason}`);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });
  }

  /**
   * Revoke all sessions for user
   */
  async revokeAllUserSessions(
    tenantId: string,
    userId: string,
    revokedBy: string,
    reason: string,
  ): Promise<number> {
    this.logger.log(`Revoking all sessions for user ${userId}`);

    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });

    return result.count;
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });

    // Update last active if session is valid
    if (session && !session.revokedAt && session.expiresAt > new Date()) {
      await this.updateLastActive(session.id);
    }

    return session;
  }

  /**
   * Validate session
   */
  async isSessionValid(token: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { token },
    });

    if (!session) return false;
    if (session.revokedAt) return false;
    if (session.expiresAt < new Date()) return false;

    return true;
  }

  /**
   * Get session statistics for user
   */
  async getSessionStatistics(userId: string) {
    const [total, active, revoked, expired] = await Promise.all([
      this.prisma.session.count({ where: { userId } }),
      this.prisma.session.count({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.session.count({
        where: { userId, revokedAt: { not: null } },
      }),
      this.prisma.session.count({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { lt: new Date() },
        },
      }),
    ]);

    return { total, active, revoked, expired };
  }

  /**
   * Cleanup old sessions (keep only N most recent)
   */
  private async cleanupOldSessions(
    userId: string,
    keepCount: number,
  ): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get sessions to delete (older than keepCount)
    const sessionsToDelete = sessions.slice(keepCount);

    if (sessionsToDelete.length > 0) {
      await this.prisma.session.deleteMany({
        where: {
          id: { in: sessionsToDelete.map((s) => s.id) },
        },
      });
    }
  }

  /**
   * Cleanup expired sessions (cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  }
}
