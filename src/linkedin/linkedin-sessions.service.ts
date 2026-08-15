import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedInSession } from '@prisma/client';

@Injectable()
export class LinkedInSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new LinkedIn session
   */
  async create(
    tenantId: string,
    userId: string,
    data: {
      cookies: string;
      userAgent: string;
      proxy?: string;
      ipAddress?: string;
      deviceInfo?: any;
    },
  ): Promise<LinkedInSession> {
    // Encrypt cookies before storing
    const encryptedCookies = this.encryptCookies(data.cookies);

    // Set expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Deactivate existing sessions
    await this.prisma.linkedInSession.updateMany({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new session
    return this.prisma.linkedInSession.create({
      data: {
        tenantId,
        userId,
        cookies: encryptedCookies,
        userAgent: data.userAgent,
        proxy: data.proxy,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        expiresAt,
        isActive: true,
      },
    });
  }

  /**
   * Get active session for user
   */
  async getActiveSession(
    tenantId: string,
    userId: string,
  ): Promise<LinkedInSession | null> {
    const session = await this.prisma.linkedInSession.findFirst({
      where: {
        tenantId,
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (session) {
      // Update last used timestamp
      await this.prisma.linkedInSession.update({
        where: { id: session.id },
        data: { lastUsed: new Date() },
      });
    }

    return session;
  }

  /**
   * Get decrypted cookies from session
   */
  async getDecryptedCookies(sessionId: string): Promise<string> {
    const session = await this.prisma.linkedInSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return this.decryptCookies(session.cookies);
  }

  /**
   * Deactivate session
   */
  async deactivate(sessionId: string): Promise<void> {
    await this.prisma.linkedInSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  /**
   * Deactivate all sessions for user
   */
  async deactivateAll(tenantId: string, userId: string): Promise<void> {
    await this.prisma.linkedInSession.updateMany({
      where: {
        tenantId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.linkedInSession.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Encrypt cookies (placeholder - implement proper encryption)
   */
  private encryptCookies(cookies: string): string {
    // TODO: Implement proper AES-256-GCM encryption
    // For now, just base64 encode (NOT SECURE - replace in production)
    return Buffer.from(cookies).toString('base64');
  }

  /**
   * Decrypt cookies
   */
  private decryptCookies(encryptedCookies: string): string {
    // TODO: Implement proper decryption
    // For now, just base64 decode
    return Buffer.from(encryptedCookies, 'base64').toString('utf-8');
  }
}
