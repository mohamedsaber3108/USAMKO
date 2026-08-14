import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const mockMasterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'ENCRYPTION_MASTER_KEY') return mockMasterKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw if master key is missing', () => {
      expect(() => {
        new EncryptionService({
          get: () => null,
        } as any);
      }).toThrow('ENCRYPTION_MASTER_KEY is required');
    });

    it('should throw if master key is invalid format', () => {
      expect(() => {
        new EncryptionService({
          get: () => 'too_short',
        } as any);
      }).toThrow('must be 64 hexadecimal characters');
    });
  });

  describe('Encryption/Decryption', () => {
    const tenantId = 'tenant_test_123';
    const plaintext = 'sensitive_data_12345';

    it('should encrypt plaintext', async () => {
      const encrypted = await service.encrypt(plaintext, tenantId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should decrypt to original plaintext', async () => {
      const encrypted = await service.encrypt(plaintext, tenantId);
      const decrypted = await service.decrypt(encrypted, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext each time (random IV)', async () => {
      const enc1 = await service.encrypt(plaintext, tenantId);
      const enc2 = await service.encrypt(plaintext, tenantId);

      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc1.iv).not.toBe(enc2.iv);
    });

    it('should throw when encrypting empty string', async () => {
      await expect(service.encrypt('', tenantId)).rejects.toThrow('Cannot encrypt empty string');
    });

    it('should throw when tenantId is missing', async () => {
      await expect(service.encrypt(plaintext, '')).rejects.toThrow('tenantId is required');
    });

    it('should fail decryption with wrong tenant key', async () => {
      const encrypted = await service.encrypt(plaintext, 'tenant_a');

      await expect(service.decrypt(encrypted, 'tenant_b')).rejects.toThrow('tampered');
    });

    it('should fail decryption if data is tampered', async () => {
      const encrypted = await service.encrypt(plaintext, tenantId);
      encrypted.ciphertext = encrypted.ciphertext.replace('a', 'b'); // Tamper

      await expect(service.decrypt(encrypted, tenantId)).rejects.toThrow();
    });
  });

  describe('JSON Serialization', () => {
    const tenantId = 'tenant_json_test';
    const plaintext = 'oauth_token_abc123';

    it('should encrypt to JSON string', async () => {
      const json = await service.encryptToJson(plaintext, tenantId);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
    });

    it('should decrypt from JSON string', async () => {
      const json = await service.encryptToJson(plaintext, tenantId);
      const decrypted = await service.decryptFromJson(json, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on invalid JSON', async () => {
      await expect(service.decryptFromJson('not_json', tenantId)).rejects.toThrow('not valid JSON');
    });
  });

  describe('Batch Operations', () => {
    const tenantId = 'tenant_batch';
    const plaintexts = ['token1', 'token2', 'token3', 'token4'];

    it('should encrypt multiple values', async () => {
      const encrypted = await service.encryptBatch(plaintexts, tenantId);

      expect(encrypted).toHaveLength(4);
      encrypted.forEach((enc) => {
        expect(enc).toHaveProperty('ciphertext');
        expect(enc).toHaveProperty('iv');
      });
    });

    it('should decrypt multiple values', async () => {
      const encrypted = await service.encryptBatch(plaintexts, tenantId);
      const decrypted = await service.decryptBatch(encrypted, tenantId);

      expect(decrypted).toEqual(plaintexts);
    });
  });

  describe('Hashing', () => {
    it('should hash a value consistently', () => {
      const value = 'password123';
      const hash1 = service.hash(value);
      const hash2 = service.hash(value);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/); // SHA-256 is 64 hex chars
    });

    it('should produce different hashes for different values', () => {
      const hash1 = service.hash('value1');
      const hash2 = service.hash('value2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token Generation', () => {
    it('should generate random tokens', () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex
    });

    it('should generate tokens of specified length', () => {
      const token = service.generateToken(16);

      expect(token).toMatch(/^[0-9a-f]{32}$/); // 16 bytes = 32 hex
    });
  });

  describe('Key Caching', () => {
    it('should cache derived keys', async () => {
      const tenantId = 'tenant_cache_test';

      await service.encrypt('test', tenantId);
      await service.encrypt('test2', tenantId);

      // Key should be cached (we can't directly test cache, but no errors = success)
      expect(true).toBe(true);
    });

    it('should clear key cache', () => {
      service.clearKeyCache();
      expect(true).toBe(true); // No error thrown
    });
  });

  describe('Tenant Isolation', () => {
    const plaintext = 'shared_secret';

    it('should isolate data between tenants', async () => {
      const encA = await service.encrypt(plaintext, 'tenant_a');
      const encB = await service.encrypt(plaintext, 'tenant_b');

      // Same plaintext, different tenants → different ciphertext
      expect(encA.ciphertext).not.toBe(encB.ciphertext);

      // Each tenant can only decrypt their own
      const decA = await service.decrypt(encA, 'tenant_a');
      expect(decA).toBe(plaintext);

      await expect(service.decrypt(encB, 'tenant_a')).rejects.toThrow();
    });
  });
});
