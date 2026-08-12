import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/**
 * API Key service for managing user API keys
 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(
    userId: string,
    name: string,
    description?: string,
    permissions?: string[],
    expiresAt?: Date,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate unique API key
    let apiKey = this.generateApiKey();
    let isUnique = false;

    while (!isUnique) {
      const existing = await this.prisma.apiKey.findUnique({
        where: { key: apiKey },
      });

      if (!existing) {
        isUnique = true;
      } else {
        apiKey = this.generateApiKey();
      }
    }

    // Create API key
    const key = await this.prisma.apiKey.create({
      data: {
        key: apiKey,
        name,
        description,
        userId,
        permissions: permissions || [],
        expiresAt,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isActive: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return key;
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isActive: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return keys;
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(apiKeyId: string, userId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: {
        id: apiKeyId,
        userId,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isActive: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    return key;
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    apiKeyId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
      expiresAt?: Date;
    },
  ) {
    const key = await this.getApiKey(apiKeyId, userId);

    const updated = await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isActive: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(apiKeyId: string, userId: string) {
    await this.getApiKey(apiKeyId, userId);

    await this.prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    return { message: 'API key deleted successfully' };
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string, userId: string) {
    return this.updateApiKey(apiKeyId, userId, { isActive: false });
  }

  /**
   * Validate an API key
   */
  async validateApiKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
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

    if (!apiKey) {
      return null;
    }

    // Check if key is active
    if (!apiKey.isActive) {
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used at
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      ...apiKey,
      user: apiKey.user,
    };
  }

  /**
   * Rotate an API key (create new, invalidate old)
   */
  async rotateApiKey(apiKeyId: string, userId: string, name?: string) {
    const oldKey = await this.getApiKey(apiKeyId, userId);

    // Create new key
    const newKey = await this.createApiKey(
      userId,
      name || oldKey.name,
      oldKey.description,
      oldKey.permissions as string[],
      oldKey.expiresAt,
    );

    // Invalidate old key
    await this.revokeApiKey(apiKeyId, userId);

    return {
      message: 'API key rotated successfully',
      newKey,
      oldKeyId: apiKeyId,
    };
  }
}