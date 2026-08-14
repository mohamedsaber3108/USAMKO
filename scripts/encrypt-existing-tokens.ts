/**
 * Migration Script: Encrypt Existing Platform Tokens
 *
 * This script encrypts all plain-text tokens in the PlatformAccount table.
 * It's idempotent - running it multiple times is safe.
 *
 * Usage:
 * ```bash
 * cd m:\USAMKO
 * npx ts-node scripts/encrypt-existing-tokens.ts
 * ```
 *
 * What it does:
 * 1. Reads all PlatformAccount records
 * 2. For each record with accessToken or refreshToken:
 *    - Checks if already encrypted (JSON format with {ciphertext, iv, authTag})
 *    - If plain-text: encrypts with EncryptionService
 *    - Updates database with encrypted value
 * 3. Reports progress and statistics
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Simplified EncryptionService (inline to avoid module dependencies)
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(masterKeyHex: string) {
    if (!masterKeyHex || !/^[0-9a-f]{64}$/i.test(masterKeyHex)) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY must be 64 hexadecimal characters. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  private deriveTenantKey(tenantId: string): Buffer {
    return crypto.createHmac('sha256', this.masterKey).update(tenantId).digest();
  }

  async encrypt(plaintext: string, tenantId: string): Promise<string> {
    const key = this.deriveTenantKey(tenantId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    });
  }

  isEncrypted(value: string): boolean {
    if (!value) return false;

    try {
      const parsed = JSON.parse(value);
      return (
        parsed.ciphertext &&
        parsed.iv &&
        parsed.authTag &&
        typeof parsed.ciphertext === 'string' &&
        typeof parsed.iv === 'string' &&
        typeof parsed.authTag === 'string'
      );
    } catch {
      return false;
    }
  }
}

async function main() {
  console.log('🔐 Starting token encryption migration...\n');

  // Check for master key
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    console.error('❌ ENCRYPTION_MASTER_KEY not found in environment variables');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const encryption = new EncryptionService(masterKey);

  try {
    // Fetch all platform accounts
    const accounts = await prisma.platformAccount.findMany({
      select: {
        id: true,
        tenantId: true,
        platform: true,
        accessToken: true,
        refreshToken: true,
      },
    });

    console.log(`📊 Found ${accounts.length} platform accounts\n`);

    if (accounts.length === 0) {
      console.log('✅ No platform accounts to process');
      return;
    }

    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // Process accessToken
        if (account.accessToken) {
          if (encryption.isEncrypted(account.accessToken)) {
            alreadyEncrypted++;
          } else {
            updates.accessToken = await encryption.encrypt(
              account.accessToken,
              account.tenantId
            );
            needsUpdate = true;
            encrypted++;
          }
        }

        // Process refreshToken
        if (account.refreshToken) {
          if (encryption.isEncrypted(account.refreshToken)) {
            // Already encrypted (might have been counted above)
          } else {
            updates.refreshToken = await encryption.encrypt(
              account.refreshToken,
              account.tenantId
            );
            needsUpdate = true;
          }
        }

        // Update database if needed
        if (needsUpdate) {
          await prisma.platformAccount.update({
            where: { id: account.id },
            data: updates,
          });

          console.log(
            `✅ Encrypted tokens for ${account.platform} account ${account.id}`
          );
        }
      } catch (error) {
        errors++;
        console.error(
          `❌ Failed to encrypt account ${account.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total accounts: ${accounts.length}`);
    console.log(`   Newly encrypted: ${encrypted}`);
    console.log(`   Already encrypted: ${alreadyEncrypted}`);
    console.log(`   Errors: ${errors}`);
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
