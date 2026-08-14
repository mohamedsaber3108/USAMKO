import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { AuditService } from '../audit/audit.service';
import { CaptureTokenDto, TokenCaptureResponseDto } from './dto/capture-token.dto';
import { SocialPlatform, AccountStatus } from '@prisma/client';

/**
 * Token Capture Service
 *
 * Handles token capture from Chrome Extension:
 * - Validates incoming tokens
 * - Encrypts tokens
 * - Stores in PlatformAccount table
 * - Logs to audit trail
 */
@Injectable()
export class TokenCaptureService {
  private readonly logger = new Logger(TokenCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Capture and store OAuth token from Chrome Extension
   */
  async captureToken(
    dto: CaptureTokenDto,
    userId: string,
    tenantId: string,
  ): Promise<TokenCaptureResponseDto> {
    this.logger.log(
      `Capturing ${dto.platform} token for account ${dto.accountId} (tenant: ${tenantId})`
    );

    try {
      // Encrypt tokens
      const encryptedAccessToken = await this.encryption.encryptToJson(
        dto.accessToken,
        tenantId,
      );

      const encryptedRefreshToken = dto.refreshToken
        ? await this.encryption.encryptToJson(dto.refreshToken, tenantId)
        : null;

      // Check if account already exists
      const existing = await this.prisma.platformAccount.findFirst({
        where: {
          tenantId,
          platform: dto.platform.toUpperCase() as SocialPlatform,
          accountId: dto.accountId,
        },
      });

      let platformAccount;

      if (existing) {
        // Update existing account
        platformAccount = await this.prisma.platformAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            status: AccountStatus.CONNECTED,
            metadata: dto.metadata || existing.metadata,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Updated existing ${dto.platform} account ${dto.accountId}`
        );
      } else {
        // Create new account
        platformAccount = await this.prisma.platformAccount.create({
          data: {
            id: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            userId,
            platform: dto.platform.toUpperCase() as SocialPlatform,
            accountName: dto.accountName || dto.accountId,
            accountId: dto.accountId,
            username: dto.username || null,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            status: AccountStatus.CONNECTED,
            metadata: dto.metadata || {},
          },
        });

        this.logger.log(
          `Created new ${dto.platform} account ${dto.accountId}`
        );
      }

      // Log to audit trail
      await this.audit.log({
        userId,
        tenantId,
        action: 'TOKEN_CAPTURE',
        entity: 'PlatformAccount',
        entityId: platformAccount.id,
        changes: {
          platform: dto.platform,
          accountId: dto.accountId,
          method: 'chrome_extension',
        },
        success: true,
      });

      return {
        success: true,
        accountId: dto.accountId,
        platform: dto.platform,
        message: 'Token captured and encrypted successfully',
        platformAccountId: platformAccount.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to capture ${dto.platform} token: ${error.message}`,
        error.stack
      );

      // Log failure to audit trail
      await this.audit.log({
        userId,
        tenantId,
        action: 'TOKEN_CAPTURE',
        entity: 'PlatformAccount',
        changes: {
          platform: dto.platform,
          accountId: dto.accountId,
        },
        error: error.message,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Get connection statistics for a user
   */
  async getConnectionStats(tenantId: string) {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { tenantId },
      select: {
        platform: true,
        status: true,
      },
    });

    const stats = {
      total: accounts.length,
      connected: accounts.filter((a) => a.status === AccountStatus.CONNECTED)
        .length,
      byPlatform: {} as Record<string, number>,
    };

    // Count by platform
    accounts.forEach((account) => {
      stats.byPlatform[account.platform] =
        (stats.byPlatform[account.platform] || 0) + 1;
    });

    return stats;
  }

  /**
   * Verify if a token is valid (basic validation)
   */
  validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic checks
    if (token.length < 10) {
      return false; // Too short
    }

    if (token.length > 10000) {
      return false; // Too long (potential attack)
    }

    return true;
  }
}
