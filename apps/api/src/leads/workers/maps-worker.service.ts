import { Injectable, Logger } from '@nestjs/common';

export interface GoogleMapsLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  location?: {
    lat: number;
    lng: number;
  };
  placeId?: string;
}

@Injectable()
export class MapsWorkerService {
  private readonly logger = new Logger(MapsWorkerService.name);

  async collectFromMaps(tenantId: string, params: {
    searchQuery: string;
    location?: string;
    maxResults: number;
  }): Promise<GoogleMapsLead[]> {
    let browser: any = null;

    try {
      this.logger.log(`Collecting Google Maps leads for tenant ${tenantId}: ${params.searchQuery}`);

      let chromium: any;
      try {
        const playwright = require('playwright');
        chromium = playwright.chromium;
      } catch (e) {
        throw new Error(
          'Playwright is not available. Please install it with: npm install playwright && npx playwright install chromium'
        );
      }

      try {
        browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
      } catch (e) {
        throw new Error(
          'Failed to launch Chromium browser. Please ensure Chromium is installed: npx playwright install chromium'
        );
      }

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
      });
      const page = await context.newPage();

      // Build the search URL
      const searchQuery = params.location
        ? `${params.searchQuery} in ${params.location}`
        : params.searchQuery;
      const encodedQuery = encodeURIComponent(searchQuery);
      const mapsUrl = `https://www.google.com/maps/search/${encodedQuery}`;

      this.logger.log(`Navigating to: ${mapsUrl}`);
      await page.goto(mapsUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for results to load
      await page.waitForTimeout(3000);

      // Accept cookies dialog if it appears
      try {
        const acceptButton = page.locator('button:has-text("Accept all")');
        if (await acceptButton.isVisible({ timeout: 3000 })) {
          await acceptButton.click();
          await page.waitForTimeout(1000);
        }
      } catch {
        // Cookie dialog may not appear, continue
      }

      // Wait for the results feed to appear
      const feedSelector = 'div[role="feed"]';
      try {
        await page.waitForSelector(feedSelector, { timeout: 10000 });
      } catch {
        // Try alternative selector for results
        this.logger.warn('Could not find results feed, attempting alternative selectors');
      }

      // Scroll through results to load more
      const maxResults = params.maxResults || 20;
      let previousCount = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = Math.ceil(maxResults / 5) + 5;

      while (scrollAttempts < maxScrollAttempts) {
        const currentCount = await page.locator('div[role="feed"] > div > div > a').count();

        if (currentCount >= maxResults) {
          break;
        }

        if (currentCount === previousCount) {
          scrollAttempts++;
          if (scrollAttempts >= 3 && currentCount > 0) {
            break; // No new results loading, stop scrolling
          }
        } else {
          scrollAttempts = 0;
        }

        previousCount = currentCount;

        // Scroll the results panel
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            feed.scrollTop = feed.scrollHeight;
          }
        });

        await page.waitForTimeout(1500);
      }

      // Extract business data from results
      const leads: GoogleMapsLead[] = [];
      const resultLinks = page.locator('div[role="feed"] > div > div > a');
      const totalResults = Math.min(await resultLinks.count(), maxResults);

      this.logger.log(`Found ${totalResults} results to process`);

      for (let i = 0; i < totalResults; i++) {
        try {
          const link = resultLinks.nth(i);

          // Click on the result to open its details panel
          await link.click();
          await page.waitForTimeout(2000);

          // Extract data from the details panel
          const lead = await page.evaluate(() => {
            const result: any = {};

            // Name
            const nameEl = document.querySelector('h1.DUwDvf') ||
              document.querySelector('h1[class*="header"]') ||
              document.querySelector('div[role="main"] h1');
            if (nameEl) {
              result.name = nameEl.textContent?.trim();
            }

            // Category
            const categoryEl = document.querySelector('button[jsaction*="category"]') ||
              document.querySelector('span.DkEaL');
            if (categoryEl) {
              result.category = categoryEl.textContent?.trim();
            }

            // Address
            const addressEl = document.querySelector('button[data-item-id="address"]') ||
              document.querySelector('button[aria-label*="Address"]');
            if (addressEl) {
              result.address = addressEl.textContent?.trim();
            } else {
              // Try alternative: look for address in info section
              const infoButtons = document.querySelectorAll('button.CsEnBe');
              for (const btn of infoButtons) {
                const ariaLabel = btn.getAttribute('aria-label') || '';
                if (ariaLabel.toLowerCase().includes('address')) {
                  result.address = ariaLabel.replace(/^Address:\s*/i, '').trim();
                }
              }
            }

            // Phone
            const phoneEl = document.querySelector('button[data-item-id*="phone"]') ||
              document.querySelector('button[aria-label*="Phone"]');
            if (phoneEl) {
              const ariaLabel = phoneEl.getAttribute('aria-label') || '';
              result.phone = ariaLabel.replace(/^Phone:\s*/i, '').trim() || phoneEl.textContent?.trim();
            } else {
              const infoButtons = document.querySelectorAll('button.CsEnBe');
              for (const btn of infoButtons) {
                const ariaLabel = btn.getAttribute('aria-label') || '';
                if (ariaLabel.toLowerCase().includes('phone')) {
                  result.phone = ariaLabel.replace(/^Phone:\s*/i, '').trim();
                }
              }
            }

            // Website
            const websiteEl = document.querySelector('a[data-item-id="authority"]') ||
              document.querySelector('a[aria-label*="Website"]');
            if (websiteEl) {
              result.website = (websiteEl as HTMLAnchorElement).href || websiteEl.textContent?.trim();
            } else {
              const infoLinks = document.querySelectorAll('a.CsEnBe');
              for (const link of infoLinks) {
                const ariaLabel = link.getAttribute('aria-label') || '';
                if (ariaLabel.toLowerCase().includes('website')) {
                  result.website = (link as HTMLAnchorElement).href;
                }
              }
            }

            // Rating
            const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]') ||
              document.querySelector('span.ceNzKf');
            if (ratingEl) {
              const ratingText = ratingEl.textContent?.trim();
              if (ratingText) {
                result.rating = parseFloat(ratingText.replace(',', '.'));
              }
            }

            // Reviews count
            const reviewsEl = document.querySelector('div.F7nice span[aria-label*="review"]') ||
              document.querySelector('span.RDApEe');
            if (reviewsEl) {
              const reviewsText = (reviewsEl.getAttribute('aria-label') || reviewsEl.textContent || '').trim();
              const match = reviewsText.match(/([\d,]+)/);
              if (match) {
                result.reviews = parseInt(match[1].replace(/,/g, ''));
              }
            }

            // Place ID from URL
            const currentUrl = window.location.href;
            const placeIdMatch = currentUrl.match(/place\/[^/]+\/([^/]+)/);
            if (placeIdMatch) {
              result.placeId = placeIdMatch[1];
            }

            return result;
          });

          if (lead && lead.name) {
            leads.push(lead as GoogleMapsLead);
            this.logger.debug(`Extracted lead: ${lead.name}`);
          }

          // Navigate back to results list
          await page.goBack({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1000);
        } catch (err) {
          this.logger.warn(`Failed to extract lead at index ${i}: ${err.message}`);
          // Try to go back to results list
          try {
            await page.goBack({ waitUntil: 'networkidle', timeout: 5000 });
            await page.waitForTimeout(1000);
          } catch {
            // If we can't go back, try navigating to the search URL again
            await page.goto(mapsUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(3000);
          }
        }
      }

      this.logger.log(`Collected ${leads.length} leads from Google Maps for tenant ${tenantId}`);
      return leads;
    } catch (error) {
      this.logger.error(`Failed to collect Google Maps leads: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          this.logger.warn(`Failed to close browser: ${e.message}`);
        }
      }
    }
  }

  async parseCsvLeads(csvContent: string): Promise<GoogleMapsLead[]> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return [];
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const leads: GoogleMapsLead[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const lead: any = {};

        headers.forEach((header, index) => {
          const value = values[index];
          if (value) {
            // Map CSV columns to lead properties
            switch (header.toLowerCase()) {
              case 'name':
              case 'business name':
                lead.name = value;
                break;
              case 'address':
              case 'location':
                lead.address = value;
                break;
              case 'phone':
              case 'phone number':
                lead.phone = value;
                break;
              case 'website':
              case 'url':
                lead.website = value;
                break;
              case 'rating':
                lead.rating = parseFloat(value);
                break;
              case 'reviews':
              case 'review count':
                lead.reviews = parseInt(value);
                break;
              case 'category':
              case 'type':
                lead.category = value;
                break;
              case 'place id':
              case 'placeid':
                lead.placeId = value;
                break;
            }
          }
        });

        if (lead.name) {
          leads.push(lead);
        }
      }

      this.logger.log(`Parsed ${leads.length} leads from CSV`);
      return leads;
    } catch (error) {
      this.logger.error(`Failed to parse CSV: ${error.message}`, error.stack);
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }
}
