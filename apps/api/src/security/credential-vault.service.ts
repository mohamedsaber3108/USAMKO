import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from './encryption.service';

/**
 * Secure Credential Vault Service
 *
 * Provides encrypted storage for sensitive credentials (API keys, passwords, tokens).
 * All data is encrypted with tenant-specific keys before storage.
 *
 * Use Cases:
 * - Store platform OAuth refresh tokens
 * - Store API keys for third-party services
 * - Store sensitive configuration values
 * - Store user passwords (though use bcrypt for password hashing)
 *
 * @example
 * await vault.store('facebook_token', token, tenantId, userId);
 * const token = await vault.retrieve('facebook_token', tenantId, userId);
 */
@Injectable()
export class CredentialVaultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Store an encrypted credential in the vault.
   *
   * @param key - Credential identifier (e.g., 'facebook_token', 'hunter_api_key')
   * @param value - The sensitive value to encrypt and store
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional, for user-specific credentials)
   * @param metadata - Optional metadata (NOT encrypted)
   */
  async store(
    key: string,
    value: string,
    tenantId: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!key || !value || !tenantId) {
      throw new Error('key, value, and tenantId are required');
    }

    // Encrypt the value
    const encrypted = await this.encryption.encryptToJson(value, tenantId);

    // Upsert to database
    await this.prisma.credentialVault.upsert({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId: userId || null,
          key,
        },
      },
      create: {
        tenantId,
        userId: userId || null,
        key,
        value: encrypted,
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        value: encrypted,
        metadata: metadata || {},
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Retrieve and decrypt a credential from the vault.
   *
   * @param key - Credential identifier
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional)
   * @returns Decrypted credential value, or null if not found
   */
  async retrieve(
    key: string,
    tenantId: string,
    userId?: string,
  ): Promise<string | null> {
    const record = await this.prisma.credentialVault.findUnique({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId: userId || null,
          key,
        },
      },
    });

    if (!record) {
      return null;
    }

    // Decrypt the value
    try {
      return await this.encryption.decryptFromJson(record.value, tenantId);
    } catch (error) {
      throw new Error(`Failed to decrypt credential '${key}': ${error.message}`);
    }
  }

  /**
   * Delete a credential from the vault.
   *
   * @param key - Credential identifier
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional)
   */
  async delete(key: string, tenantId: string, userId?: string): Promise<void> {
    await this.prisma.credentialVault.delete({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId: userId || null,
          key,
        },
      },
    });
  }

  /**
   * List all credential keys for a tenant/user (does NOT return values).
   *
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional)
   * @returns Array of credential keys
   */
  async listKeys(tenantId: string, userId?: string): Promise<string[]> {
    const records = await this.prisma.credentialVault.findMany({
      where: {
        tenantId,
        userId: userId || null,
      },
      select: { key: true },
    });

    return records.map((r) => r.key);
  }

  /**
   * Check if a credential exists without retrieving it.
   *
   * @param key - Credential identifier
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional)
   * @returns True if exists, false otherwise
   */
  async exists(key: string, tenantId: string, userId?: string): Promise<boolean> {
    const count = await this.prisma.credentialVault.count({
      where: {
        tenantId,
        userId: userId || null,
        key,
      },
    });

    return count > 0;
  }

  /**
   * Get credential with metadata (decrypted value + metadata).
   *
   * @param key - Credential identifier
   * @param tenantId - Tenant identifier
   * @param userId - User identifier (optional)
   * @returns Object with value and metadata, or null if not found
   */
  async getWithMetadata(
    key: string,
    tenantId: string,
    userId?: string,
  ): Promise<{ value: string; metadata: any; updatedAt: Date } | null> {
    const record = await this.prisma.credentialVault.findUnique({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId: userId || null,
          key,
        },
      },
    });

    if (!record) {
      return null;
    }

    const value = await this.encryption.decryptFromJson(record.value, tenantId);

    return {
      value,
      metadata: record.metadata || {},
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Rotate (re-encrypt) all credentials for a tenant.
   * Use this if you suspect the master key has been compromised.
   *
   * @param tenantId - Tenant identifier
   */
  async rotateAllCredentials(tenantId: string): Promise<number> {
    const records = await this.prisma.credentialVault.findMany({
      where: { tenantId },
    });

    let rotated = 0;

    for (const record of records) {
      try {
        // Decrypt with old key
        const plaintext = await this.encryption.decryptFromJson(record.value, tenantId);

        // Re-encrypt with current key (in case master key was rotated)
        const newEncrypted = await this.encryption.encryptToJson(plaintext, tenantId);

        // Update
        await this.prisma.credentialVault.update({
          where: { id: record.id },
          data: {
            value: newEncrypted,
            updatedAt: new Date(),
          },
        });

        rotated++;
      } catch (error) {
        // Log error but continue with other credentials
        console.error(`Failed to rotate credential ${record.key}:`, error.message);
      }
    }

    return rotated;
  }

  /**
   * Delete all credentials for a tenant (use when deleting a tenant).
   *
   * @param tenantId - Tenant identifier
   * @returns Number of credentials deleted
   */
  async deleteAllForTenant(tenantId: string): Promise<number> {
    const result = await this.prisma.credentialVault.deleteMany({
      where: { tenantId },
    });

    return result.count;
  }

  /**
   * Delete all credentials for a user (use when deleting a user).
   *
   * @param userId - User identifier
   * @param tenantId - Tenant identifier
   * @returns Number of credentials deleted
   */
  async deleteAllForUser(userId: string, tenantId: string): Promise<number> {
    const result = await this.prisma.credentialVault.deleteMany({
      where: {
        userId,
        tenantId,
      },
    });

    return result.count;
  }
}
