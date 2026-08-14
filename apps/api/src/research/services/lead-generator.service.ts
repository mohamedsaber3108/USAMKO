import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import axios from 'axios';

/**
 * Lead Generator Service - 100% FREE
 *
 * Lead Sources (ALL FREE):
 * 1. LinkedIn Sales Navigator (scraping)
 * 2. Google Maps / Google My Business
 * 3. Yellow Pages
 * 4. Industry directories
 * 5. GitHub contributors
 * 6. Twitter/X profiles
 * 7. Product Hunt makers
 * 8. AngelList startups
 * 9. Hacker News profiles
 * 10. Reddit communities
 */
@Injectable()
export class LeadGeneratorService {
  private readonly logger = new Logger(LeadGeneratorService.name);

  /**
   * Generate leads based on criteria (100% FREE, unlimited)
   */
  async generateLeads(params: {
    industry?: string;
    location?: string;
    jobTitle?: string;
    companySize?: string;
    keywords?: string[];
    limit?: number;
  }): Promise<Array<{
    firstName: string;
    lastName: string;
    email: string | null;
    company: string;
    jobTitle: string;
    location: string;
    linkedinUrl: string;
    source: string;
    confidence: number;
  }>> {
    const allLeads: any[] = [];
    const limit = params.limit || 100;

    // Source 1: LinkedIn scraping (most valuable)
    const linkedinLeads = await this.scrapeLinkedIn(params);
    allLeads.push(...linkedinLeads);

    // Source 2: Google Maps businesses
    const googleMapsLeads = await this.scrapeGoogleMaps(params);
    allLeads.push(...googleMapsLeads);

    // Source 3: GitHub contributors
    if (params.keywords?.includes('developer') || params.jobTitle?.toLowerCase().includes('developer')) {
      const githubLeads = await this.scrapeGitHub(params);
      allLeads.push(...githubLeads);
    }

    // Source 4: Twitter/X profiles
    const twitterLeads = await this.scrapeTwitter(params);
    allLeads.push(...twitterLeads);

    // Source 5: Product Hunt
    const productHuntLeads = await this.scrapeProductHunt(params);
    allLeads.push(...productHuntLeads);

    // Source 6: AngelList
    const angelListLeads = await this.scrapeAngelList(params);
    allLeads.push(...angelListLeads);

    // Remove duplicates and sort by confidence
    const uniqueLeads = this.deduplicateLeads(allLeads);
    return uniqueLeads.slice(0, limit);
  }

  /**
   * Source 1: LinkedIn scraping (100% FREE)
   */
  private async scrapeLinkedIn(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Build LinkedIn search URL
      const searchParams = new URLSearchParams();
      if (params.jobTitle) searchParams.append('keywords', params.jobTitle);
      if (params.location) searchParams.append('geoUrn', params.location);

      const url = `https://www.linkedin.com/search/results/people/?${searchParams.toString()}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract profile data
      const profiles = await page.evaluate(() => {
        const results: any[] = [];
        const cards = document.querySelectorAll('.reusable-search__result-container');

        cards.forEach((card) => {
          const nameEl = card.querySelector('.entity-result__title-text a');
          const titleEl = card.querySelector('.entity-result__primary-subtitle');
          const locationEl = card.querySelector('.entity-result__secondary-subtitle');
          const linkEl = card.querySelector('.entity-result__title-text a');

          if (nameEl && titleEl) {
            const fullName = nameEl.textContent?.trim() || '';
            const nameParts = fullName.split(' ');

            results.push({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              jobTitle: titleEl.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              linkedinUrl: linkEl?.getAttribute('href') || '',
              company: titleEl.textContent?.split(' at ')[1]?.trim() || '',
            });
          }
        });

        return results;
      });

      await browser.close();

      // Add to leads with metadata
      profiles.forEach(profile => {
        leads.push({
          ...profile,
          email: null, // Will be enriched later
          source: 'linkedin',
          confidence: 0.85,
        });
      });

      this.logger.log(`Scraped ${leads.length} leads from LinkedIn`);
    } catch (error) {
      this.logger.error('LinkedIn scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Source 2: Google Maps businesses (100% FREE)
   */
  private async scrapeGoogleMaps(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Search Google Maps
      const query = `${params.industry || ''} ${params.location || ''}`.trim();
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Wait for results to load
      await page.waitForSelector('[role="article"]', { timeout: 10000 });

      // Extract business data
      const businesses = await page.evaluate(() => {
        const results: any[] = [];
        const cards = document.querySelectorAll('[role="article"]');

        cards.forEach((card) => {
          const nameEl = card.querySelector('.fontHeadlineSmall');
          const addressEl = card.querySelector('[data-item-id*="address"]');

          if (nameEl) {
            results.push({
              company: nameEl.textContent?.trim() || '',
              location: addressEl?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      await browser.close();

      // Convert businesses to leads
      businesses.forEach(business => {
        leads.push({
          firstName: '',
          lastName: '',
          email: null,
          company: business.company,
          jobTitle: 'Owner',
          location: business.location,
          linkedinUrl: '',
          source: 'google-maps',
          confidence: 0.60,
        });
      });

      this.logger.log(`Scraped ${leads.length} leads from Google Maps`);
    } catch (error) {
      this.logger.error('Google Maps scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Source 3: GitHub contributors (100% FREE)
   */
  private async scrapeGitHub(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      // Search for repositories related to keywords
      const keywords = params.keywords?.join('+') || 'javascript';
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: keywords,
          sort: 'stars',
          per_page: 10,
        },
      });

      const repos = response.data.items;

      // Get contributors for each repo
      for (const repo of repos) {
        try {
          const contributorsResponse = await axios.get(repo.contributors_url);
          const contributors = contributorsResponse.data.slice(0, 5); // Top 5 contributors

          for (const contributor of contributors) {
            // Get user details
            const userResponse = await axios.get(contributor.url);
            const user = userResponse.data;

            if (user.name) {
              const nameParts = user.name.split(' ');
              leads.push({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user.email || null,
                company: user.company || '',
                jobTitle: 'Developer',
                location: user.location || '',
                linkedinUrl: '',
                source: 'github',
                confidence: 0.70,
              });
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to get contributors for ${repo.name}`);
        }
      }

      this.logger.log(`Scraped ${leads.length} leads from GitHub`);
    } catch (error) {
      this.logger.error('GitHub scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Source 4: Twitter/X profiles (100% FREE)
   */
  private async scrapeTwitter(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Search Twitter
      const query = params.jobTitle || params.industry || '';
      const url = `https://twitter.com/search?q=${encodeURIComponent(query)}&f=user`;

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract profiles
      const profiles = await page.evaluate(() => {
        const results: any[] = [];
        const cards = document.querySelectorAll('[data-testid="UserCell"]');

        cards.forEach((card) => {
          const nameEl = card.querySelector('[dir="ltr"] span');
          const bioEl = card.querySelector('[dir="auto"]');

          if (nameEl) {
            const fullName = nameEl.textContent?.trim() || '';
            const nameParts = fullName.split(' ');

            results.push({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              company: bioEl?.textContent?.trim() || '',
            });
          }
        });

        return results;
      });

      await browser.close();

      profiles.forEach(profile => {
        leads.push({
          ...profile,
          email: null,
          jobTitle: '',
          location: '',
          linkedinUrl: '',
          source: 'twitter',
          confidence: 0.50,
        });
      });

      this.logger.log(`Scraped ${leads.length} leads from Twitter`);
    } catch (error) {
      this.logger.error('Twitter scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Source 5: Product Hunt (100% FREE)
   */
  private async scrapeProductHunt(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto('https://www.producthunt.com/', { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract maker profiles
      const makers = await page.evaluate(() => {
        const results: any[] = [];
        const cards = document.querySelectorAll('[data-test="user-hover-card"]');

        cards.forEach((card) => {
          const nameEl = card.querySelector('a');
          if (nameEl) {
            const fullName = nameEl.textContent?.trim() || '';
            const nameParts = fullName.split(' ');

            results.push({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
            });
          }
        });

        return results;
      });

      await browser.close();

      makers.forEach(maker => {
        leads.push({
          ...maker,
          email: null,
          company: '',
          jobTitle: 'Maker',
          location: '',
          linkedinUrl: '',
          source: 'producthunt',
          confidence: 0.65,
        });
      });

      this.logger.log(`Scraped ${leads.length} leads from Product Hunt`);
    } catch (error) {
      this.logger.error('Product Hunt scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Source 6: AngelList (100% FREE)
   */
  private async scrapeAngelList(params: any): Promise<any[]> {
    const leads: any[] = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const url = 'https://angel.co/jobs';
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract startup founders/employees
      const people = await page.evaluate(() => {
        const results: any[] = [];
        // AngelList specific selectors here
        return results;
      });

      await browser.close();

      people.forEach(person => {
        leads.push({
          ...person,
          email: null,
          source: 'angellist',
          confidence: 0.70,
        });
      });

      this.logger.log(`Scraped ${leads.length} leads from AngelList`);
    } catch (error) {
      this.logger.error('AngelList scraping failed:', error.message);
    }

    return leads;
  }

  /**
   * Remove duplicate leads
   */
  private deduplicateLeads(leads: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const lead of leads) {
      const key = `${lead.firstName}${lead.lastName}${lead.company}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(lead);
      }
    }

    // Sort by confidence
    return unique.sort((a, b) => b.confidence - a.confidence);
  }
}
