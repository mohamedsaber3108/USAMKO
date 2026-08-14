/**
 * Security Integration Tests
 *
 * Tests the complete security flow:
 * - Encryption → Storage → Retrieval → Decryption
 * - Credential Vault operations
 * - Audit logging
 * - Multi-tenant isolation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { CredentialVaultService } from './credential-vault.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma.service';

// Mock Prisma
const mockPrisma = {
  credentialVault: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('Security Integration Tests', () => {
  let encryptionService: EncryptionService;
  let vaultService: CredentialVaultService;
  let auditService: AuditService;
  const testMasterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        CredentialVaultService,
        AuditService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'ENCRYPTION_MASTER_KEY') return testMasterKey;
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    encryptionService = module.get<EncryptionService>(EncryptionService);
    vaultService = module.get<CredentialVaultService>(CredentialVaultService);
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Complete Encryption Flow', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'oauth_access_token_12345';
      const tenantId = 'tenant_123';

      // Encrypt
      const encrypted = await encryptionService.encrypt(plaintext, tenantId);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      // Decrypt
      const decrypted = await encryptionService.decrypt(encrypted, tenantId);
      expect(decrypted).toBe(plaintext);
    });

    it('should prevent cross-tenant decryption', async () => {
      const plaintext = 'sensitive_data';

      const encrypted = await encryptionService.encrypt(plaintext, 'tenant_a');

      await expect(
        encryptionService.decrypt(encrypted, 'tenant_b')
      ).rejects.toThrow();
    });
  });

  describe('Credential Vault Flow', () => {
    it('should store and retrieve credentials', async () => {
      const tenantId = 'tenant_123';
      const userId = 'user_456';
      const key = 'facebook_token';
      const value = 'token_abc123';

      // Mock database responses
      mockPrisma.credentialVault.upsert.mockResolvedValue({
        id: 'vault_1',
        tenantId,
        userId,
        key,
        value: await encryptionService.encryptToJson(value, tenantId),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.credentialVault.findUnique.mockResolvedValue({
        id: 'vault_1',
        tenantId,
        userId,
        key,
        value: await encryptionService.encryptToJson(value, tenantId),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store
      await vaultService.store(key, value, tenantId, userId);
      expect(mockPrisma.credentialVault.upsert).toHaveBeenCalled();

      // Retrieve
      const retrieved = await vaultService.retrieve(key, tenantId, userId);
      expect(retrieved).toBe(value);
    });

    it('should list credential keys without exposing values', async () => {
      const tenantId = 'tenant_123';

      mockPrisma.credentialVault.findMany.mockResolvedValue([
        { key: 'facebook_token' },
        { key: 'hunter_api_key' },
        { key: 'twitter_token' },
      ]);

      const keys = await vaultService.listKeys(tenantId);

      expect(keys).toHaveLength(3);
      expect(keys).toContain('facebook_token');
      expect(keys).toContain('hunter_api_key');
      expect(keys).toContain('twitter_token');
    });

    it('should delete credentials', async () => {
      const tenantId = 'tenant_123';
      const userId = 'user_456';
      const key = 'facebook_token';

      mockPrisma.credentialVault.delete.mockResolvedValue({});

      await vaultService.delete(key, tenantId, userId);

      expect(mockPrisma.credentialVault.delete).toHaveBeenCalledWith({
        where: {
          tenantId_userId_key: {
            tenantId,
            userId,
            key,
          },
        },
      });
    });

    it('should rotate all credentials for a tenant', async () => {
      const tenantId = 'tenant_123';
      const plaintext = 'original_token';

      mockPrisma.credentialVault.findMany.mockResolvedValue([
        {
          id: 'vault_1',
          key: 'token_1',
          value: await encryptionService.encryptToJson(plaintext, tenantId),
          tenantId,
        },
        {
          id: 'vault_2',
          key: 'token_2',
          value: await encryptionService.encryptToJson(plaintext, tenantId),
          tenantId,
        },
      ]);

      mockPrisma.credentialVault.update.mockResolvedValue({});

      const rotated = await vaultService.rotateAllCredentials(tenantId);

      expect(rotated).toBe(2);
      expect(mockPrisma.credentialVault.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audit Logging Flow', () => {
    it('should log successful operations', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await auditService.log({
        userId: 'user_123',
        tenantId: 'tenant_456',
        action: 'POST /campaigns',
        entity: 'Campaign',
        entityId: 'campaign_789',
        changes: { name: 'New Campaign' },
        success: true,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        duration: 150,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should redact sensitive fields', async () => {
      mockPrisma.auditLog.create.mockImplementation((args) => {
        // Check that sensitive fields are redacted
        const changes = args.data.changes;
        expect(changes.password).toBe('[REDACTED]');
        expect(changes.accessToken).toBe('[REDACTED]');
        expect(changes.name).toBe('Test User');
        return Promise.resolve({});
      });

      await auditService.log({
        userId: 'user_123',
        tenantId: 'tenant_456',
        action: 'POST /users',
        entity: 'User',
        changes: {
          name: 'Test User',
          password: 'secret123',
          accessToken: 'token_abc',
        },
        success: true,
      });
    });

    it('should query audit logs with filters', async () => {
      const tenantId = 'tenant_123';

      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log_1',
          tenantId,
          action: 'POST /campaigns',
          timestamp: new Date(),
        },
        {
          id: 'log_2',
          tenantId,
          action: 'DELETE /campaigns/123',
          timestamp: new Date(),
        },
      ]);

      const logs = await auditService.query({
        tenantId,
        entity: 'Campaign',
        limit: 10,
      });

      expect(logs).toHaveLength(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
          take: 10,
        })
      );
    });

    it('should get audit statistics', async () => {
      const tenantId = 'tenant_123';

      mockPrisma.auditLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // successful
        .mockResolvedValueOnce(10); // failed

      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { entity: 'Campaign', _count: 50 },
        { entity: 'PlatformAccount', _count: 30 },
        { entity: 'Workflow', _count: 20 },
      ]);

      const stats = await auditService.getStats(tenantId);

      expect(stats.total).toBe(100);
      expect(stats.successful).toBe(90);
      expect(stats.failed).toBe(10);
      expect(stats.successRate).toBe(90);
      expect(stats.byEntity).toHaveLength(3);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should use different encryption keys for different tenants', async () => {
      const plaintext = 'shared_secret';

      const encA = await encryptionService.encrypt(plaintext, 'tenant_a');
      const encB = await encryptionService.encrypt(plaintext, 'tenant_b');

      // Same plaintext, different tenants → different ciphertext
      expect(encA.ciphertext).not.toBe(encB.ciphertext);

      // Each tenant can decrypt their own
      const decA = await encryptionService.decrypt(encA, 'tenant_a');
      const decB = await encryptionService.decrypt(encB, 'tenant_b');

      expect(decA).toBe(plaintext);
      expect(decB).toBe(plaintext);

      // Cross-tenant decryption should fail
      await expect(encryptionService.decrypt(encA, 'tenant_b')).rejects.toThrow();
      await expect(encryptionService.decrypt(encB, 'tenant_a')).rejects.toThrow();
    });

    it('should isolate credentials between tenants', async () => {
      const key = 'api_key';
      const valueA = 'tenant_a_secret';
      const valueB = 'tenant_b_secret';

      // Store for tenant A
      mockPrisma.credentialVault.upsert.mockResolvedValueOnce({
        id: 'vault_a',
        tenantId: 'tenant_a',
        userId: null,
        key,
        value: await encryptionService.encryptToJson(valueA, 'tenant_a'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store for tenant B
      mockPrisma.credentialVault.upsert.mockResolvedValueOnce({
        id: 'vault_b',
        tenantId: 'tenant_b',
        userId: null,
        key,
        value: await encryptionService.encryptToJson(valueB, 'tenant_b'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await vaultService.store(key, valueA, 'tenant_a');
      await vaultService.store(key, valueB, 'tenant_b');

      // Retrieve for tenant A
      mockPrisma.credentialVault.findUnique.mockResolvedValueOnce({
        id: 'vault_a',
        tenantId: 'tenant_a',
        userId: null,
        key,
        value: await encryptionService.encryptToJson(valueA, 'tenant_a'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const retrievedA = await vaultService.retrieve(key, 'tenant_a');
      expect(retrievedA).toBe(valueA);

      // Retrieve for tenant B
      mockPrisma.credentialVault.findUnique.mockResolvedValueOnce({
        id: 'vault_b',
        tenantId: 'tenant_b',
        userId: null,
        key,
        value: await encryptionService.encryptToJson(valueB, 'tenant_b'),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const retrievedB = await vaultService.retrieve(key, 'tenant_b');
      expect(retrievedB).toBe(valueB);
    });
  });

  describe('Error Handling', () => {
    it('should handle tampered encryption data', async () => {
      const plaintext = 'secret';
      const tenantId = 'tenant_123';

      const encrypted = await encryptionService.encrypt(plaintext, tenantId);

      // Tamper with ciphertext
      encrypted.ciphertext = encrypted.ciphertext.replace('a', 'b');

      await expect(
        encryptionService.decrypt(encrypted, tenantId)
      ).rejects.toThrow();
    });

    it('should handle invalid JSON in vault', async () => {
      const tenantId = 'tenant_123';

      mockPrisma.credentialVault.findUnique.mockResolvedValue({
        id: 'vault_1',
        tenantId,
        userId: null,
        key: 'test_key',
        value: 'not_valid_json',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        vaultService.retrieve('test_key', tenantId)
      ).rejects.toThrow();
    });

    it('should not throw when audit logging fails', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        auditService.log({
          action: 'POST /test',
          success: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should cache tenant keys for performance', async () => {
      const tenantId = 'tenant_123';
      const plaintext = 'test';

      // Encrypt multiple times - should use cached key
      await encryptionService.encrypt(plaintext, tenantId);
      await encryptionService.encrypt(plaintext, tenantId);
      await encryptionService.encrypt(plaintext, tenantId);

      // All operations should complete quickly (key derivation happens once)
      const start = Date.now();
      await encryptionService.encrypt(plaintext, tenantId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast with caching
    });

    it('should handle batch encryption efficiently', async () => {
      const tenantId = 'tenant_123';
      const plaintexts = Array.from({ length: 100 }, (_, i) => `token_${i}`);

      const start = Date.now();
      const encrypted = await encryptionService.encryptBatch(plaintexts, tenantId);
      const duration = Date.now() - start;

      expect(encrypted).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
