import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * AES-256-GCM Encryption Service
 *
 * Provides tenant-scoped encryption for sensitive data (OAuth tokens, API keys, credentials).
 * Each tenant gets a derived encryption key from the master key for data isolation.
 *
 * Security Features:
 * - AES-256-GCM (authenticated encryption)
 * - Per-tenant key derivation (HMAC-SHA256)
 * - Random IV per encryption operation
 * - Authentication tag for integrity verification
 *
 * @example
 * const encrypted = await encryptionService.encrypt('secret', 'tenant_123');
 * const plaintext = await encryptionService.decrypt(encrypted, 'tenant_123');
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;
  private readonly keyCache = new Map<string, Buffer>();

  constructor(private readonly config: ConfigService) {
    // Master key must be 64 hex characters (32 bytes)
    const masterKeyHex = this.config.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKeyHex) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY is required. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    if (!/^[0-9a-f]{64}$/i.test(masterKeyHex)) {
      throw new Error('ENCRYPTION_MASTER_KEY must be 64 hexadecimal characters (32 bytes)');
    }

    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  onModuleInit() {
    // Verify crypto module is available
    if (!crypto.getCiphers().includes(this.algorithm)) {
      throw new Error(`Cipher ${this.algorithm} is not available in this Node.js version`);
    }
  }

  /**
   * Derive a tenant-specific encryption key from the master key.
   * Uses HMAC-SHA256 for deterministic key derivation.
   * Results are cached to avoid repeated derivation overhead.
   */
  private deriveTenantKey(tenantId: string): Buffer {
    if (!tenantId) {
      throw new Error('tenantId is required for encryption');
    }

    // Check cache first
    if (this.keyCache.has(tenantId)) {
      return this.keyCache.get(tenantId)!;
    }

    // Derive key: HMAC-SHA256(masterKey, tenantId)
    const derivedKey = crypto
      .createHmac('sha256', this.masterKey)
      .update(tenantId)
      .digest();

    // Cache for future use (max 1000 entries to prevent memory leak)
    if (this.keyCache.size < 1000) {
      this.keyCache.set(tenantId, derivedKey);
    }

    return derivedKey;
  }

  /**
   * Encrypt plaintext using AES-256-GCM with tenant-scoped key.
   *
   * @param plaintext - The data to encrypt
   * @param tenantId - Tenant identifier for key derivation
   * @returns Encrypted data with IV and authentication tag
   *
   * @throws Error if encryption fails
   */
  async encrypt(plaintext: string, tenantId: string): Promise<EncryptedData> {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string');
    }

    const key = this.deriveTenantKey(tenantId);

    // Generate random IV (96 bits / 12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    try {
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      // Get authentication tag for integrity verification
      const authTag = cipher.getAuthTag();

      return {
        ciphertext,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM with tenant-scoped key.
   * Verifies authentication tag to ensure data integrity.
   *
   * @param encrypted - The encrypted data object
   * @param tenantId - Tenant identifier for key derivation
   * @returns Decrypted plaintext
   *
   * @throws Error if decryption fails or authentication fails
   */
  async decrypt(encrypted: EncryptedData, tenantId: string): Promise<string> {
    if (!encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
      throw new Error('Invalid encrypted data structure');
    }

    const key = this.deriveTenantKey(tenantId);

    try {
      const iv = Buffer.from(encrypted.iv, 'hex');
      const authTag = Buffer.from(encrypted.authTag, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      // Authentication failure or tampering detected
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Decryption failed: data has been tampered with or wrong tenant key');
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt and serialize to JSON string (for database storage).
   *
   * @param plaintext - The data to encrypt
   * @param tenantId - Tenant identifier
   * @returns JSON string containing encrypted data
   */
  async encryptToJson(plaintext: string, tenantId: string): Promise<string> {
    const encrypted = await this.encrypt(plaintext, tenantId);
    return JSON.stringify(encrypted);
  }

  /**
   * Deserialize from JSON and decrypt (from database storage).
   *
   * @param encryptedJson - JSON string from database
   * @param tenantId - Tenant identifier
   * @returns Decrypted plaintext
   */
  async decryptFromJson(encryptedJson: string, tenantId: string): Promise<string> {
    try {
      const encrypted = JSON.parse(encryptedJson) as EncryptedData;
      return await this.decrypt(encrypted, tenantId);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid encrypted data: not valid JSON');
      }
      throw error;
    }
  }

  /**
   * Encrypt multiple values at once (batch operation).
   * More efficient than encrypting one by one.
   *
   * @param plaintexts - Array of plaintexts to encrypt
   * @param tenantId - Tenant identifier
   * @returns Array of encrypted data
   */
  async encryptBatch(
    plaintexts: string[],
    tenantId: string,
  ): Promise<EncryptedData[]> {
    return Promise.all(plaintexts.map((pt) => this.encrypt(pt, tenantId)));
  }

  /**
   * Decrypt multiple values at once (batch operation).
   *
   * @param encryptedList - Array of encrypted data
   * @param tenantId - Tenant identifier
   * @returns Array of decrypted plaintexts
   */
  async decryptBatch(
    encryptedList: EncryptedData[],
    tenantId: string,
  ): Promise<string[]> {
    return Promise.all(encryptedList.map((enc) => this.decrypt(enc, tenantId)));
  }

  /**
   * Hash a value using SHA-256 (one-way, for comparison).
   * Use this for password hashing, token verification, etc.
   *
   * @param value - Value to hash
   * @returns Hex-encoded hash
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a cryptographically secure random token.
   * Useful for API keys, session tokens, etc.
   *
   * @param bytes - Number of random bytes (default 32)
   * @returns Hex-encoded random token
   */
  generateToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Clear the key derivation cache (for testing or security reasons).
   */
  clearKeyCache(): void {
    this.keyCache.clear();
  }
}
