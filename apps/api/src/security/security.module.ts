import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { CredentialVaultService } from './credential-vault.service';
import { PrismaService } from '../prisma.service';

/**
 * Security Module
 *
 * Provides encryption and secure credential storage services.
 *
 * Services:
 * - EncryptionService: AES-256-GCM encryption with tenant-scoped keys
 * - CredentialVaultService: Encrypted credential storage
 *
 * Import this module wherever you need to encrypt/decrypt sensitive data.
 *
 * @example
 * @Module({
 *   imports: [SecurityModule],
 *   controllers: [PlatformController],
 *   providers: [PlatformService],
 * })
 * export class PlatformModule {}
 */
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, CredentialVaultService, PrismaService],
  exports: [EncryptionService, CredentialVaultService],
})
export class SecurityModule {}
