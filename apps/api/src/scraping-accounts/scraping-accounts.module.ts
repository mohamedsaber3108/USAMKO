import { Module } from '@nestjs/common';
import { ScrapingAccountsController } from './scraping-accounts.controller';
import { ScrapingAccountsService } from './scraping-accounts.service';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from './encryption.service';

/**
 * Scraping Accounts Module
 *
 * Manages secure storage of scraping credentials:
 * - LinkedIn accounts (email/password or cookies)
 * - Google API keys
 * - Proxy configurations
 * - Platform-specific credentials
 */
@Module({
  controllers: [ScrapingAccountsController],
  providers: [ScrapingAccountsService, PrismaService, EncryptionService],
  exports: [ScrapingAccountsService],
})
export class ScrapingAccountsModule {}
