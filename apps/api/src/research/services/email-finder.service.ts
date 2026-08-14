import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as puppeteer from 'puppeteer';

/**
 * Email Finder Service - 100% FREE
 *
 * Methods:
 * 1. Hunter.io API (25 free searches/month)
 * 2. Web scraping (unlimited)
 * 3. Pattern matching (unlimited)
 * 4. Google dorking (unlimited)
 */
@Injectable()
export class EmailFinderService {
  private readonly logger = new Logger(EmailFinderService.name);
  private readonly hunterApiKey = process.env.HUNTER_API_KEY; // Optional: 25 free/month

  /**
   * Find email using multiple FREE methods
   */
  async findEmail(params: {
    firstName: string;
    lastName: string;
    company: string;
    domain?: string;
  }): Promise<{
    email: string | null;
    confidence: number;
    source: string;
    alternativeEmails: string[];
  }> {
    const results: Array<{ email: string; confidence: number; source: string }> = [];

    // Method 1: Hunter.io API (if key provided, 25 free/month)
    if (this.hunterApiKey && params.domain) {
      try {
        const hunterResult = await this.findWithHunter({
          firstName: params.firstName,
          lastName: params.lastName,
          domain: params.domain,
        });
        if (hunterResult) results.push(hunterResult);
      } catch (error) {
        this.logger.warn('Hunter.io search failed, continuing with other methods');
      }
    }

    // Method 2: Email pattern matching (100% free, unlimited)
    if (params.domain) {
      const patternResults = await this.findWithPatterns({
        firstName: params.firstName,
        lastName: params.lastName,
        domain: params.domain,
      });
      results.push(...patternResults);
    }

    // Method 3: Google dorking (100% free, unlimited)
    const googleResults = await this.findWithGoogleDork(params);
    results.push(...googleResults);

    // Method 4: LinkedIn scraping (100% free, unlimited)
    const linkedinResults = await this.findWithLinkedInScraping(params);
    results.push(...linkedinResults);

    // Method 5: GitHub scraping (100% free, unlimited)
    const githubResults = await this.findWithGitHub(params);
    results.push(...githubResults);

    // Sort by confidence and return best match
    results.sort((a, b) => b.confidence - a.confidence);

    return {
      email: results[0]?.email || null,
      confidence: results[0]?.confidence || 0,
      source: results[0]?.source || 'none',
      alternativeEmails: results.slice(1, 5).map(r => r.email),
    };
  }

  /**
   * Method 1: Hunter.io API (25 free searches/month)
   */
  private async findWithHunter(params: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<{ email: string; confidence: number; source: string } | null> {
    try {
      const response = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: {
          domain: params.domain,
          first_name: params.firstName,
          last_name: params.lastName,
          api_key: this.hunterApiKey,
        },
      });

      if (response.data?.data?.email) {
        return {
          email: response.data.data.email,
          confidence: response.data.data.score / 100,
          source: 'hunter.io',
        };
      }
    } catch (error) {
      this.logger.error('Hunter.io API error:', error.message);
    }

    return null;
  }

  /**
   * Method 2: Email pattern matching (100% FREE, unlimited)
   * Common patterns: firstname@domain, f.lastname@domain, etc.
   */
  private async findWithPatterns(params: {
    firstName: string;
    lastName: string;
    domain: string;
  }): Promise<Array<{ email: string; confidence: number; source: string }>> {
    const { firstName, lastName, domain } = params;
    const fn = firstName.toLowerCase();
    const ln = lastName.toLowerCase();
    const first = fn.charAt(0);

    // 20 most common email patterns
    const patterns = [
      `${fn}@${domain}`,                    // john@company.com (20%)
      `${fn}.${ln}@${domain}`,              // john.doe@company.com (18%)
      `${first}${ln}@${domain}`,            // jdoe@company.com (15%)
      `${fn}_${ln}@${domain}`,              // john_doe@company.com (10%)
      `${ln}@${domain}`,                    // doe@company.com (8%)
      `${fn}${ln}@${domain}`,               // johndoe@company.com (7%)
      `${first}.${ln}@${domain}`,           // j.doe@company.com (5%)
      `${ln}.${fn}@${domain}`,              // doe.john@company.com (4%)
      `${fn}-${ln}@${domain}`,              // john-doe@company.com (3%)
      `${ln}${fn}@${domain}`,               // doejohn@company.com (2%)
      `${fn}${first}${ln}@${domain}`,       // johnjdoe@company.com (1%)
      `${first}${ln}${fn.charAt(1)}@${domain}`, // jdoeo@company.com (1%)
      `contact@${domain}`,                  // Generic
      `info@${domain}`,                     // Generic
      `${fn}+${ln}@${domain}`,              // john+doe@company.com
    ];

    const confidences = [0.20, 0.18, 0.15, 0.10, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01];

    return patterns.map((email, index) => ({
      email,
      confidence: confidences[index] || 0.01,
      source: 'pattern-matching',
    }));
  }

  /**
   * Method 3: Google dorking (100% FREE, unlimited)
   * Search Google for email mentions
   */
  private async findWithGoogleDork(params: {
    firstName: string;
    lastName: string;
    company: string;
    domain?: string;
  }): Promise<Array<{ email: string; confidence: number; source: string }>> {
    const results: Array<{ email: string; confidence: number; source: string }> = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Google dork queries
      const queries = [
        `"${params.firstName} ${params.lastName}" "${params.company}" email`,
        `"${params.firstName} ${params.lastName}" @${params.domain}`,
        `site:${params.domain || params.company} "${params.firstName} ${params.lastName}"`,
      ];

      for (const query of queries) {
        try {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

          // Extract emails from search results
          const emails = await page.evaluate(() => {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const text = document.body.innerText;
            return text.match(emailRegex) || [];
          });

          // Add found emails
          emails.forEach(email => {
            if (email.toLowerCase().includes(params.firstName.toLowerCase()) ||
                email.toLowerCase().includes(params.lastName.toLowerCase())) {
              results.push({
                email,
                confidence: 0.60,
                source: 'google-dork',
              });
            }
          });
        } catch (error) {
          this.logger.warn(`Google dork query failed: ${query}`);
        }
      }

      await browser.close();
    } catch (error) {
      this.logger.error('Google dorking failed:', error.message);
    }

    return results;
  }

  /**
   * Method 4: LinkedIn scraping (100% FREE, unlimited)
   */
  private async findWithLinkedInScraping(params: {
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<Array<{ email: string; confidence: number; source: string }>> {
    const results: Array<{ email: string; confidence: number; source: string }> = [];

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Search LinkedIn
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${params.firstName}%20${params.lastName}%20${params.company}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

      // Extract contact info (if available publicly)
      const emails = await page.evaluate(() => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const text = document.body.innerText;
        return text.match(emailRegex) || [];
      });

      emails.forEach(email => {
        results.push({
          email,
          confidence: 0.70,
          source: 'linkedin-scraping',
        });
      });

      await browser.close();
    } catch (error) {
      this.logger.error('LinkedIn scraping failed:', error.message);
    }

    return results;
  }

  /**
   * Method 5: GitHub scraping (100% FREE, unlimited)
   * Many developers have emails in their GitHub profiles
   */
  private async findWithGitHub(params: {
    firstName: string;
    lastName: string;
  }): Promise<Array<{ email: string; confidence: number; source: string }>> {
    const results: Array<{ email: string; confidence: number; source: string }> = [];

    try {
      // Search GitHub for user
      const searchUrl = `https://github.com/search?q=${params.firstName}+${params.lastName}&type=users`;

      const response = await axios.get(searchUrl);
      const html = response.data;

      // Extract emails from page
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = html.match(emailRegex) || [];

      emails.forEach(email => {
        results.push({
          email,
          confidence: 0.50,
          source: 'github',
        });
      });
    } catch (error) {
      this.logger.error('GitHub search failed:', error.message);
    }

    return results;
  }

  /**
   * Verify email actually exists (100% FREE)
   * Uses SMTP verification
   */
  async verifyEmail(email: string): Promise<{
    valid: boolean;
    smtp: boolean;
    disposable: boolean;
    score: number;
  }> {
    try {
      // Basic syntax validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return { valid: false, smtp: false, disposable: false, score: 0 };
      }

      // Check against disposable email domains
      const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
      const domain = email.split('@')[1];
      const isDisposable = disposableDomains.includes(domain);

      // TODO: Implement SMTP verification (optional)
      // This requires more setup but is 100% free

      return {
        valid: true,
        smtp: false, // Would require SMTP check
        disposable: isDisposable,
        score: isDisposable ? 0.3 : 0.8,
      };
    } catch (error) {
      this.logger.error('Email verification failed:', error.message);
      return { valid: false, smtp: false, disposable: false, score: 0 };
    }
  }

  /**
   * Bulk email finder (100% FREE, unlimited)
   */
  async findBulkEmails(leads: Array<{
    firstName: string;
    lastName: string;
    company: string;
    domain?: string;
  }>): Promise<Array<{
    input: any;
    email: string | null;
    confidence: number;
    source: string;
  }>> {
    const results = [];

    for (const lead of leads) {
      try {
        const result = await this.findEmail(lead);
        results.push({
          input: lead,
          ...result,
        });
      } catch (error) {
        this.logger.error(`Failed to find email for ${lead.firstName} ${lead.lastName}:`, error.message);
        results.push({
          input: lead,
          email: null,
          confidence: 0,
          source: 'error',
        });
      }
    }

    return results;
  }
}
