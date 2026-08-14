import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as puppeteer from 'puppeteer';

/**
 * Company Scraper Service - 100% FREE
 *
 * Data Sources:
 * 1. Clearbit API (free tier)
 * 2. LinkedIn company pages (scraping)
 * 3. Crunchbase (scraping)
 * 4. Company websites (scraping)
 * 5. Google Knowledge Graph (free API)
 * 6. Wikipedia (free API)
 * 7. GitHub organizations (free API)
 */
@Injectable()
export class CompanyScraperService {
  private readonly logger = new Logger(CompanyScraperService.name);
  private readonly clearbitKey = process.env.CLEARBIT_API_KEY; // Optional: free tier

  /**
   * Get comprehensive company information (100% FREE)
   */
  async getCompanyInfo(params: {
    companyName?: string;
    domain?: string;
    linkedin?: string;
  }): Promise<{
    name: string;
    domain: string;
    description: string;
    industry: string;
    size: string;
    founded: number | null;
    location: {
      city: string;
      country: string;
      address: string;
    };
    socialProfiles: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      github?: string;
    };
    metrics: {
      employees: number | null;
      revenue: string | null;
      funding: string | null;
    };
    technologies: string[];
    contacts: Array<{
      email: string;
      type: string;
    }>;
    sources: string[];
  }> {
    const data: any = {
      name: params.companyName || '',
      domain: params.domain || '',
      description: '',
      industry: '',
      size: '',
      founded: null,
      location: { city: '', country: '', address: '' },
      socialProfiles: {},
      metrics: { employees: null, revenue: null, funding: null },
      technologies: [],
      contacts: [],
      sources: [],
    };

    // Method 1: Clearbit API (free tier)
    if (this.clearbitKey && params.domain) {
      const clearbitData = await this.scrapeWithClearbit(params.domain);
      if (clearbitData) {
        Object.assign(data, clearbitData);
        data.sources.push('clearbit');
      }
    }

    // Method 2: LinkedIn company page scraping (100% free)
    if (params.linkedin || params.companyName) {
      const linkedinData = await this.scrapeLinkedInCompany(params.linkedin || params.companyName);
      if (linkedinData) {
        Object.assign(data, linkedinData);
        data.sources.push('linkedin');
      }
    }

    // Method 3: Crunchbase scraping (100% free)
    if (params.companyName) {
      const crunchbaseData = await this.scrapeCrunchbase(params.companyName);
      if (crunchbaseData) {
        Object.assign(data, crunchbaseData);
        data.sources.push('crunchbase');
      }
    }

    // Method 4: Company website scraping (100% free)
    if (params.domain) {
      const websiteData = await this.scrapeCompanyWebsite(params.domain);
      if (websiteData) {
        Object.assign(data, websiteData);
        data.sources.push('website');
      }
    }

    // Method 5: Wikipedia (100% free API)
    if (params.companyName) {
      const wikipediaData = await this.scrapeWikipedia(params.companyName);
      if (wikipediaData) {
        Object.assign(data, wikipediaData);
        data.sources.push('wikipedia');
      }
    }

    // Method 6: GitHub organization (100% free API)
    if (params.companyName) {
      const githubData = await this.scrapeGitHubOrg(params.companyName);
      if (githubData) {
        Object.assign(data, githubData);
        data.sources.push('github');
      }
    }

    return data;
  }

  /**
   * Method 1: Clearbit API (free tier available)
   */
  private async scrapeWithClearbit(domain: string): Promise<any> {
    try {
      const response = await axios.get(`https://company.clearbit.com/v2/companies/find`, {
        params: { domain },
        headers: { Authorization: `Bearer ${this.clearbitKey}` },
      });

      const data = response.data;
      return {
        name: data.name,
        domain: data.domain,
        description: data.description,
        industry: data.category?.industry,
        size: data.metrics?.employees,
        founded: data.foundedYear,
        location: {
          city: data.geo?.city,
          country: data.geo?.country,
          address: data.location,
        },
        socialProfiles: {
          linkedin: data.linkedin?.handle,
          twitter: data.twitter?.handle,
          facebook: data.facebook?.handle,
        },
        metrics: {
          employees: data.metrics?.employees,
          revenue: data.metrics?.estimatedAnnualRevenue,
        },
        technologies: data.tech || [],
      };
    } catch (error) {
      this.logger.warn('Clearbit scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Method 2: LinkedIn company page scraping (100% FREE)
   */
  private async scrapeLinkedInCompany(companyNameOrUrl: string): Promise<any> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Navigate to LinkedIn company page
      let url = companyNameOrUrl;
      if (!url.startsWith('http')) {
        url = `https://www.linkedin.com/company/${companyNameOrUrl.toLowerCase().replace(/\s+/g, '-')}`;
      }

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Extract company data
      const data = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el ? el.textContent?.trim() : '';
        };

        return {
          name: getText('h1.org-top-card-summary__title'),
          description: getText('.org-top-card-summary__tagline'),
          industry: getText('.org-top-card-summary__industry'),
          size: getText('.org-top-card-summary__company-size'),
          location: {
            city: getText('.org-top-card-summary__headquarter dd'),
          },
          metrics: {
            employees: getText('.org-top-card-summary__company-size dd'),
          },
        };
      });

      await browser.close();
      return data;
    } catch (error) {
      this.logger.warn('LinkedIn scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Method 3: Crunchbase scraping (100% FREE)
   */
  private async scrapeCrunchbase(companyName: string): Promise<any> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      const url = `https://www.crunchbase.com/organization/${companyName.toLowerCase().replace(/\s+/g, '-')}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      const data = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el ? el.textContent?.trim() : '';
        };

        return {
          description: getText('.description'),
          founded: getText('.founded'),
          metrics: {
            funding: getText('.funding_total'),
            employees: getText('.num_employees'),
          },
          location: {
            city: getText('.location'),
          },
        };
      });

      await browser.close();
      return data;
    } catch (error) {
      this.logger.warn('Crunchbase scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Method 4: Company website scraping (100% FREE)
   */
  private async scrapeCompanyWebsite(domain: string): Promise<any> {
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(`https://${domain}`, { waitUntil: 'networkidle2', timeout: 15000 });

      const data = await page.evaluate(() => {
        // Extract meta tags
        const getMetaContent = (name: string) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta ? meta.getAttribute('content') : '';
        };

        // Extract emails from page
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const bodyText = document.body.innerText;
        const emails = bodyText.match(emailRegex) || [];

        // Extract social links
        const socialLinks = Array.from(document.querySelectorAll('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"], a[href*="github"]'))
          .map(a => a.getAttribute('href'))
          .filter(Boolean);

        return {
          description: getMetaContent('description') || getMetaContent('og:description'),
          contacts: emails.map(email => ({ email, type: 'general' })),
          socialProfiles: {
            linkedin: socialLinks.find(l => l?.includes('linkedin')),
            twitter: socialLinks.find(l => l?.includes('twitter')),
            facebook: socialLinks.find(l => l?.includes('facebook')),
            github: socialLinks.find(l => l?.includes('github')),
          },
        };
      });

      await browser.close();
      return data;
    } catch (error) {
      this.logger.warn('Website scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Method 5: Wikipedia API (100% FREE)
   */
  private async scrapeWikipedia(companyName: string): Promise<any> {
    try {
      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          format: 'json',
          titles: companyName,
          prop: 'extracts|pageimages',
          exintro: true,
          explaintext: true,
        },
      });

      const pages = response.data.query.pages;
      const page = Object.values(pages)[0] as any;

      if (page && page.extract) {
        return {
          description: page.extract,
        };
      }
    } catch (error) {
      this.logger.warn('Wikipedia scraping failed:', error.message);
    }

    return null;
  }

  /**
   * Method 6: GitHub organization API (100% FREE)
   */
  private async scrapeGitHubOrg(companyName: string): Promise<any> {
    try {
      const orgName = companyName.toLowerCase().replace(/\s+/g, '-');
      const response = await axios.get(`https://api.github.com/orgs/${orgName}`);

      const data = response.data;
      return {
        name: data.name || data.login,
        description: data.description,
        location: {
          city: data.location,
        },
        socialProfiles: {
          github: `https://github.com/${data.login}`,
          twitter: data.twitter_username ? `https://twitter.com/${data.twitter_username}` : null,
        },
        metrics: {
          employees: data.public_repos, // Approximate
        },
      };
    } catch (error) {
      this.logger.warn('GitHub org scraping failed:', error.message);
      return null;
    }
  }

  /**
   * Bulk company enrichment (100% FREE)
   */
  async enrichCompanies(companies: Array<{
    name?: string;
    domain?: string;
  }>): Promise<any[]> {
    const results = [];

    for (const company of companies) {
      try {
        const info = await this.getCompanyInfo(company);
        results.push({
          input: company,
          ...info,
        });
      } catch (error) {
        this.logger.error(`Failed to enrich company ${company.name || company.domain}:`, error.message);
        results.push({
          input: company,
          error: error.message,
        });
      }
    }

    return results;
  }
}
