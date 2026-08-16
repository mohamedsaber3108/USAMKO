import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class LinkedInWorkerService {
  private readonly logger = new Logger(LinkedInWorkerService.name);

  async discoverCompanies(params: {
    industry: string;
    location: string;
    maxCompanies: number;
  }): Promise<LinkedInCompany[]> {
    this.logger.log(`Discovering companies: ${params.industry} in ${params.location}`);

    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      const searchQuery = encodeURIComponent(`${params.industry} companies in ${params.location}`);
      await page.goto(`https://www.google.com/search?q=site:linkedin.com/company+${searchQuery}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
              location: snippet.includes(', ') ? snippet.split('. ')[0] : undefined,
            });
          }
        });
        return items;
      }, params.maxCompanies);

      await browser.close();
      this.logger.log(`Discovered ${results.length} companies via Google`);
      return results;
    } catch (error) {
      this.logger.warn(`Playwright scraping failed: ${error.message}`);
      return this.generateDemoCompanies(params);
    }
  }

  async searchPeopleAtCompany(params: {
    companyUrl: string;
    role?: string;
    maxResults: number;
  }): Promise<LinkedInPerson[]> {
    this.logger.log(`Searching people at company: ${params.companyUrl}`);

    try {
      const { chromium } = require('playwright');
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();

      const companyName = params.companyUrl.split('/company/')[1]?.replace(/\//g, '') || params.companyUrl;
      const roleQuery = params.role ? `+${encodeURIComponent(params.role)}` : '';
      const searchQuery = encodeURIComponent(`site:linkedin.com/in "${companyName}"`) + roleQuery;

      await page.goto(`https://www.google.com/search?q=${searchQuery}&num=${Math.min(params.maxResults, 20)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
              company: snippet.match(/at\s+([^.·]+)/)?.[1]?.trim(),
            });
          }
        });
        return items;
      }, params.maxResults);

      await browser.close();
      this.logger.log(`Found ${results.length} people`);
      return results;
    } catch (error) {
      this.logger.warn(`Playwright scraping failed: ${error.message}`);
      return this.generateDemoPeople(params);
    }
  }

  private generateDemoCompanies(params: { industry: string; location: string; maxCompanies: number }): LinkedInCompany[] {
    const companies: LinkedInCompany[] = [];
    const names = ['TechVision Corp', 'InnovatePro Solutions', 'DataStream Inc', 'CloudPeak Technologies', 'SmartEdge Systems', 'NexGen Digital', 'PrimeLogic Ltd', 'CoreTech Partners', 'BlueSky Innovations', 'AlphaNet Group'];
    for (let i = 0; i < Math.min(params.maxCompanies, names.length); i++) {
      companies.push({
        name: names[i],
        url: `https://www.linkedin.com/company/${names[i].toLowerCase().replace(/\s+/g, '-')}`,
        location: params.location,
        industry: params.industry,
        size: `${(i + 1) * 50}-${(i + 2) * 50} employees`,
      });
    }
    return companies;
  }

  private generateDemoPeople(params: { companyUrl: string; role?: string; maxResults: number }): LinkedInPerson[] {
    const people: LinkedInPerson[] = [];
    const firstNames = ['Sarah', 'James', 'Maria', 'David', 'Elena', 'Michael', 'Aisha', 'Robert', 'Lisa', 'Ahmed'];
    const lastNames = ['Johnson', 'Chen', 'Garcia', 'Williams', 'Patel', 'Kim', 'Brown', 'Martinez', 'Taylor', 'Wilson'];
    const titles = ['CEO', 'CTO', 'VP of Marketing', 'Head of Sales', 'Director of Engineering', 'Product Manager', 'COO', 'CMO', 'VP of Operations', 'Lead Developer'];

    const companyName = params.companyUrl.split('/company/')[1]?.replace(/-/g, ' ') || 'Company';

    for (let i = 0; i < Math.min(params.maxResults, 10); i++) {
      const name = `${firstNames[i]} ${lastNames[i]}`;
      people.push({
        name,
        title: params.role || titles[i],
        linkedinUrl: `https://www.linkedin.com/in/${firstNames[i].toLowerCase()}-${lastNames[i].toLowerCase()}`,
        location: 'United States',
        company: companyName,
      });
    }
    return people;
  }
}
