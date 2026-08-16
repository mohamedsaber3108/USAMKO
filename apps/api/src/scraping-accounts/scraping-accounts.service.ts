import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from './encryption.service';

export interface ScrapingAccount {
  id: string;
  tenantId: string;
  userId: string;
  platform: 'linkedin' | 'google' | 'facebook' | 'instagram' | 'twitter';
  accountType: 'credentials' | 'cookies' | 'api_key' | 'oauth';
  accountName: string;
  status: 'active' | 'inactive' | 'error';
  lastVerified?: Date;
  isDefault: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedInCredentials {
  email: string;
  password: string;
}

export interface LinkedInCookies {
  li_at: string; // LinkedIn auth token
  JSESSIONID: string;
  liap?: string;
  [key: string]: string;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
}

/**
 * Scraping Accounts Service
 *
 * Manages platform credentials for authenticated scraping
 */
@Injectable()
export class ScrapingAccountsService {
  private readonly logger = new Logger(ScrapingAccountsService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Create a new scraping account
   */
  async createAccount(
    tenantId: string,
    userId: string,
    data: {
      platform: string;
      accountType: string;
      accountName: string;
      credentials?: any;
      cookies?: any;
      apiKey?: string;
      proxy?: ProxyConfig;
    },
  ): Promise<ScrapingAccount> {
    this.logger.log(`Creating ${data.platform} account for user ${userId}`);

    // Encrypt sensitive data
    let encryptedData: string;
    if (data.credentials) {
      encryptedData = this.encryption.encrypt(JSON.stringify(data.credentials));
    } else if (data.cookies) {
      encryptedData = this.encryption.encrypt(JSON.stringify(data.cookies));
    } else if (data.apiKey) {
      encryptedData = this.encryption.encrypt(data.apiKey);
    }

    // Store in database
    const account = await this.prisma.scrapingAccount.create({
      data: {
        tenantId,
        userId,
        platform: data.platform,
        accountType: data.accountType,
        accountName: data.accountName,
        encryptedCredentials: encryptedData,
        proxyConfig: data.proxy ? JSON.stringify(data.proxy) : null,
        status: 'active',
        isDefault: false,
      },
    });

    return this.mapToScrapingAccount(account);
  }

  /**
   * Get all scraping accounts for a user
   */
  async getAccounts(tenantId: string, userId: string): Promise<ScrapingAccount[]> {
    const accounts = await this.prisma.scrapingAccount.findMany({
      where: { tenantId, userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return accounts.map((a) => this.mapToScrapingAccount(a));
  }

  /**
   * Get accounts by platform
   */
  async getAccountsByPlatform(
    tenantId: string,
    userId: string,
    platform: string,
  ): Promise<ScrapingAccount[]> {
    const accounts = await this.prisma.scrapingAccount.findMany({
      where: { tenantId, userId, platform, status: 'active' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return accounts.map((a) => this.mapToScrapingAccount(a));
  }

  /**
   * Get default account for a platform
   */
  async getDefaultAccount(
    tenantId: string,
    userId: string,
    platform: string,
  ): Promise<ScrapingAccount | null> {
    const account = await this.prisma.scrapingAccount.findFirst({
      where: { tenantId, userId, platform, status: 'active', isDefault: true },
    });

    return account ? this.mapToScrapingAccount(account) : null;
  }

  /**
   * Get decrypted credentials for an account
   */
  async getCredentials(accountId: string, tenantId: string): Promise<any> {
    const account = await this.prisma.scrapingAccount.findFirst({
      where: { id: accountId, tenantId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.encryptedCredentials) {
      return null;
    }

    try {
      const decrypted = this.encryption.decrypt(account.encryptedCredentials);
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt credentials', error);
      return null;
    }
  }

  /**
   * Test account connection
   */
  async testConnection(accountId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const account = await this.prisma.scrapingAccount.findFirst({
      where: { id: accountId, tenantId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    try {
      const credentials = await this.getCredentials(accountId, tenantId);

      // Test based on platform and account type
      if (account.platform === 'linkedin') {
        if (account.accountType === 'cookies') {
          return await this.testLinkedInCookies(credentials);
        } else if (account.accountType === 'credentials') {
          return await this.testLinkedInCredentials(credentials);
        }
      }

      return { success: false, message: 'Testing not implemented for this platform' };
    } catch (error) {
      this.logger.error('Connection test failed', error);

      await this.prisma.scrapingAccount.update({
        where: { id: accountId },
        data: { status: 'error' },
      });

      return { success: false, message: error.message };
    }
  }

  /**
   * Set account as default
   */
  async setDefault(accountId: string, tenantId: string): Promise<void> {
    const account = await this.prisma.scrapingAccount.findFirst({
      where: { id: accountId, tenantId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Unset all other defaults for this platform
    await this.prisma.scrapingAccount.updateMany({
      where: { tenantId, platform: account.platform, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    await this.prisma.scrapingAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    });
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: string, tenantId: string): Promise<void> {
    await this.prisma.scrapingAccount.deleteMany({
      where: { id: accountId, tenantId },
    });
  }

  /**
   * Update account status
   */
  async updateStatus(
    accountId: string,
    tenantId: string,
    status: 'active' | 'inactive' | 'error',
  ): Promise<void> {
    await this.prisma.scrapingAccount.updateMany({
      where: { id: accountId, tenantId },
      data: { status, lastVerified: new Date() },
    });
  }

  // ─── Private Methods ───────────────────────────────────

  private mapToScrapingAccount(dbAccount: any): ScrapingAccount {
    return {
      id: dbAccount.id,
      tenantId: dbAccount.tenantId,
      userId: dbAccount.userId,
      platform: dbAccount.platform,
      accountType: dbAccount.accountType,
      accountName: dbAccount.accountName,
      status: dbAccount.status,
      lastVerified: dbAccount.lastVerified,
      isDefault: dbAccount.isDefault,
      metadata: dbAccount.metadata,
      createdAt: dbAccount.createdAt,
      updatedAt: dbAccount.updatedAt,
    };
  }

  private async testLinkedInCookies(cookies: LinkedInCookies): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();

      // Set cookies
      await context.addCookies([
        {
          name: 'li_at',
          value: cookies.li_at,
          domain: '.linkedin.com',
          path: '/',
        },
        {
          name: 'JSESSIONID',
          value: cookies.JSESSIONID,
          domain: '.linkedin.com',
          path: '/',
        },
      ]);

      const page = await context.newPage();
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Check if we're logged in
      const isLoggedIn = await page.evaluate(() => {
        return !window.location.href.includes('/login') &&
               !window.location.href.includes('/uas/login');
      });

      await browser.close();

      return isLoggedIn
        ? { success: true, message: 'LinkedIn cookies are valid' }
        : { success: false, message: 'LinkedIn cookies expired or invalid' };
    } catch (error) {
      return { success: false, message: `Test failed: ${error.message}` };
    }
  }

  private async testLinkedInCredentials(credentials: LinkedInCredentials): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[name="session_key"]', credentials.email);
      await page.fill('input[name="session_password"]', credentials.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(5000);

      const isLoggedIn = await page.evaluate(() => {
        return !window.location.href.includes('/login') &&
               !window.location.href.includes('/checkpoint');
      });

      await browser.close();

      return isLoggedIn
        ? { success: true, message: 'LinkedIn credentials are valid' }
        : { success: false, message: 'Invalid credentials or CAPTCHA required' };
    } catch (error) {
      return { success: false, message: `Test failed: ${error.message}` };
    }
  }
}
