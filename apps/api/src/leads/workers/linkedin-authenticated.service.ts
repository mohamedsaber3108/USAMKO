import { Injectable, Logger } from '@nestjs/common';
import { ScrapingAccountsService, LinkedInCookies, LinkedInCredentials } from '../../scraping-accounts/scraping-accounts.service';

export interface LinkedInCompany {
  name: string;
  url: string;
  location?: string;
  industry?: string;
  size?: string;
  description?: string;
}

export interface LinkedInPerson {
  name: string;
  title?: string;
  linkedinUrl: string;
  location?: string;
  company?: string;
}

/**
 * Authenticated LinkedIn Scraper
 *
 * Uses stored user credentials or cookies for authenticated LinkedIn scraping.
 * Falls back to public scraping if no credentials available.
 */
@Injectable()
export class LinkedInAuthenticatedService {
  private readonly logger = new Logger(LinkedInAuthenticatedService.name);

  constructor(
    private readonly scrapingAccountsService: ScrapingAccountsService,
  ) {}

  /**
   * Search companies with authentication
   */
  async discoverCompanies(params: {
    tenantId: string;
    userId: string;
    industry: string;
    location: string;
    maxCompanies: number;
  }): Promise<LinkedInCompany[]> {
    this.logger.log(`Discovering companies: ${params.industry} in ${params.location}`);

    // Try to get authenticated account
    const account = await this.scrapingAccountsService.getDefaultAccount(
      params.tenantId,
      params.userId,
      'linkedin',
    );

    if (account) {
      this.logger.log(`Using authenticated LinkedIn account: ${account.accountName}`);
      return this.discoverCompaniesAuthenticated(account, params);
    } else {
      this.logger.warn('No LinkedIn account found, falling back to public scraping');
      return this.discoverCompaniesPublic(params);
    }
  }

  /**
   * Search people at company with authentication
   */
  async searchPeopleAtCompany(params: {
    tenantId: string;
    userId: string;
    companyUrl: string;
    role?: string;
    maxResults: number;
  }): Promise<LinkedInPerson[]> {
    this.logger.log(`Searching people at company: ${params.companyUrl}`);

    // Try to get authenticated account
    const account = await this.scrapingAccountsService.getDefaultAccount(
      params.tenantId,
      params.userId,
      'linkedin',
    );

    if (account) {
      this.logger.log(`Using authenticated LinkedIn account: ${account.accountName}`);
      return this.searchPeopleAuthenticated(account, params);
    } else {
      this.logger.warn('No LinkedIn account found, falling back to public scraping');
      return this.searchPeoplePublic(params);
    }
  }

  // ─── Authenticated Methods ─────────────────────────────────

  private async discoverCompaniesAuthenticated(
    account: any,
    params: { industry: string; location: string; maxCompanies: number },
  ): Promise<LinkedInCompany[]> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext();

      // Get and apply credentials
      const credentials = await this.scrapingAccountsService.getCredentials(
        account.id,
        account.tenantId,
      );

      if (account.accountType === 'cookies') {
        await this.applyCookies(context, credentials as LinkedInCookies);
      } else if (account.accountType === 'credentials') {
        await this.loginWithCredentials(context, credentials as LinkedInCredentials);
      }

      const page = await context.newPage();

      // Use LinkedIn's company search directly
      const searchQuery = encodeURIComponent(`${params.industry} ${params.location}`);
      await page.goto(
        `https://www.linkedin.com/search/results/companies/?keywords=${searchQuery}`,
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      await page.waitForTimeout(3000);

      // Extract companies
      const companies = await page.evaluate((max: number) => {
        const results: any[] = [];
        const items = document.querySelectorAll('.entity-result');

        items.forEach((item) => {
          if (results.length >= max) return;

          const nameEl = item.querySelector('.entity-result__title-text a');
          const locationEl = item.querySelector('.entity-result__secondary-subtitle');
          const descEl = item.querySelector('.entity-result__summary');

          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim() || '',
              url: (nameEl as HTMLAnchorElement).href || '',
              location: locationEl?.textContent?.trim(),
              description: descEl?.textContent?.trim(),
            });
          }
        });

        return results;
      }, params.maxCompanies);

      await browser.close();

      this.logger.log(`Discovered ${companies.length} companies (authenticated)`);
      return companies;
    } catch (error) {
      this.logger.error('Authenticated scraping failed:', error);
      // Mark account as error
      await this.scrapingAccountsService.updateStatus(
        account.id,
        account.tenantId,
        'error',
      );
      // Fall back to public
      return this.discoverCompaniesPublic(params);
    }
  }

  private async searchPeopleAuthenticated(
    account: any,
    params: { companyUrl: string; role?: string; maxResults: number },
  ): Promise<LinkedInPerson[]> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext();

      // Get and apply credentials
      const credentials = await this.scrapingAccountsService.getCredentials(
        account.id,
        account.tenantId,
      );

      if (account.accountType === 'cookies') {
        await this.applyCookies(context, credentials as LinkedInCookies);
      } else if (account.accountType === 'credentials') {
        await this.loginWithCredentials(context, credentials as LinkedInCredentials);
      }

      const page = await context.newPage();

      // Extract company ID from URL
      const companyId = params.companyUrl.match(/company\/([^\/]+)/)?.[1];
      if (!companyId) {
        throw new Error('Invalid company URL');
      }

      // Use LinkedIn's people search for this company
      const roleQuery = params.role ? `&keywords=${encodeURIComponent(params.role)}` : '';
      await page.goto(
        `https://www.linkedin.com/search/results/people/?currentCompany=["${companyId}"]${roleQuery}`,
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      await page.waitForTimeout(3000);

      // Extract people
      const people = await page.evaluate((max: number) => {
        const results: any[] = [];
        const items = document.querySelectorAll('.entity-result');

        items.forEach((item) => {
          if (results.length >= max) return;

          const nameEl = item.querySelector('.entity-result__title-text a');
          const titleEl = item.querySelector('.entity-result__primary-subtitle');
          const locationEl = item.querySelector('.entity-result__secondary-subtitle');

          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim() || '',
              linkedinUrl: (nameEl as HTMLAnchorElement).href || '',
              title: titleEl?.textContent?.trim(),
              location: locationEl?.textContent?.trim(),
            });
          }
        });

        return results;
      }, params.maxResults);

      await browser.close();

      this.logger.log(`Found ${people.length} people (authenticated)`);
      return people;
    } catch (error) {
      this.logger.error('Authenticated scraping failed:', error);
      // Mark account as error
      await this.scrapingAccountsService.updateStatus(
        account.id,
        account.tenantId,
        'error',
      );
      // Fall back to public
      return this.searchPeoplePublic(params);
    }
  }

  // ─── Helper Methods ────────────────────────────────────────

  private async applyCookies(context: any, cookies: LinkedInCookies) {
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
  }

  private async loginWithCredentials(context: any, credentials: LinkedInCredentials) {
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="session_key"]', credentials.email);
    await page.fill('input[name="session_password"]', credentials.password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(5000);
    await page.close();
  }

  // ─── Public Fallback Methods ───────────────────────────────

  private async discoverCompaniesPublic(params: {
    industry: string;
    location: string;
    maxCompanies: number;
  }): Promise<LinkedInCompany[]> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ]
      });
      const page = await browser.newPage();

      // Stealth mode
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      });
      await page.setViewportSize({ width: 1920, height: 1080 });

      const searchQuery = encodeURIComponent(`${params.industry} companies in ${params.location}`);
      await page.goto(`https://www.google.com/search?q=site:linkedin.com/company+${searchQuery}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const results = await page.evaluate((max: number) => {
        const items: any[] = [];
        const links = document.querySelectorAll('a[href*="linkedin.com/company"]');
        links.forEach((link: any) => {
          if (items.length >= max) return;
          const href = link.href;
          const text = link.closest('.g')?.querySelector('h3')?.textContent || link.textContent;
          const snippet = link.closest('.g')?.querySelector('.VwiC3b')?.textContent || '';
          if (href && text) {
            items.push({
              name: text.replace(' | LinkedIn', '').replace(' - LinkedIn', '').trim(),
              url: href.split('&')[0],
              description: snippet,
            });
          }
        });
        return items;
      }, params.maxCompanies);

      await browser.close();
      this.logger.log(`Discovered ${results.length} companies via Google (public)`);
      return results;
    } catch (error) {
      this.logger.warn(`Public scraping failed: ${error.message}`);
      return [];
    }
  }

  private async searchPeoplePublic(params: {
    companyUrl: string;
    role?: string;
    maxResults: number;
  }): Promise<LinkedInPerson[]> {
    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ]
      });
      const page = await browser.newPage();

      // Stealth mode
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      await page.setViewportSize({ width: 1920, height: 1080 });

      const companyName = params.companyUrl.split('/company/')[1]?.replace(/\//g, '') || params.companyUrl;
      const roleQuery = params.role ? `+${encodeURIComponent(params.role)}` : '';
      const searchQuery = encodeURIComponent(`site:linkedin.com/in "${companyName}"`) + roleQuery;

      await page.goto(`https://www.google.com/search?q=${searchQuery}&num=${Math.min(params.maxResults, 20)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      const results = await page.evaluate((max: number) => {
        const items: any[] = [];
        const links = document.querySelectorAll('a[href*="linkedin.com/in/"]');
        links.forEach((link: any) => {
          if (items.length >= max) return;
          const href = link.href;
          const titleEl = link.closest('.g')?.querySelector('h3');
          const text = titleEl?.textContent || '';
          const snippet = link.closest('.g')?.querySelector('.VwiC3b')?.textContent || '';

          if (href && text) {
            const namePart = text.replace(' - LinkedIn', '').replace(' | LinkedIn', '').split(' - ')[0].trim();
            const titlePart = text.includes(' - ') ? text.split(' - ')[1]?.replace(' - LinkedIn', '').trim() : undefined;
            items.push({
              name: namePart,
              title: titlePart,
              linkedinUrl: href.split('&')[0],
              location: snippet.match(/[A-Z][a-z]+,\s*[A-Z][a-z]+/)?.[0],
            });
          }
        });
        return items;
      }, params.maxResults);

      await browser.close();
      this.logger.log(`Found ${results.length} people via Google (public)`);
      return results;
    } catch (error) {
      this.logger.warn(`Public scraping failed: ${error.message}`);
      return [];
    }
  }
}
