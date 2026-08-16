import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  SourceConfig,
  SourceType,
  SourceCapability,
  DataCollectionRequest,
  RawDataItem,
} from './source.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * Scrapling Data Source
 *
 * Web scraping source powered by Scrapling Python library
 * Communicates with Scrapling microservice
 */
@Injectable()
export class ScraplingDataSource extends DataSource {
  private readonly logger = new Logger(ScraplingDataSource.name);
  private httpClient: AxiosInstance;
  private serviceUrl: string;

  config: SourceConfig = {
    id: 'scrapling',
    name: 'Scrapling Web Scraper',
    type: SourceType.WEB_SCRAPING,
    capabilities: [
      SourceCapability.PROFILE_EXTRACTION,
      SourceCapability.LIST_EXTRACTION,
      SourceCapability.COMPANY_RESEARCH,
    ],
    requiresAuth: false,
    requiresBrowser: false,
    supportsProxy: true,
    supportsConcurrency: true,
    rateLimit: {
      requests: 1000,
      period: 'hour',
    },
    priority: 8,
    reliability: 0.8,
    averageLatency: 2000,
    enabled: true,
  };

  constructor() {
    super();
    this.serviceUrl = process.env.SCRAPLING_SERVICE_URL || 'http://localhost:8001';
    this.httpClient = axios.create({
      baseURL: this.serviceUrl,
      timeout: 60000,
    });
  }

  canHandle(request: DataCollectionRequest): boolean {
    // Scrapling can handle web URLs
    if (request.filters?.url || request.filters?.website) {
      return true;
    }

    // Can handle generic web scraping requests
    if (request.entityType === 'custom' || request.filters?.extractFromWeb) {
      return true;
    }

    return false;
  }

  async estimate(request: DataCollectionRequest): Promise<{
    estimatedResults: number;
    estimatedTime: number;
    estimatedCost: number;
  }> {
    const urlCount = this.extractUrls(request).length;
    return {
      estimatedResults: urlCount * 10, // Estimate 10 items per URL
      estimatedTime: urlCount * this.config.averageLatency,
      estimatedCost: 0, // Free self-hosted
    };
  }

  async collect(request: DataCollectionRequest): Promise<RawDataItem[]> {
    const allItems: RawDataItem[] = [];
    const urls = this.extractUrls(request);

    if (urls.length === 0) {
      this.logger.warn('No URLs provided for Scrapling source');
      return [];
    }

    this.logger.log(`Scraping ${urls.length} URLs with Scrapling`);

    // Process URLs in parallel (with limit)
    const concurrentLimit = 5;
    for (let i = 0; i < urls.length; i += concurrentLimit) {
      const batch = urls.slice(i, i + concurrentLimit);
      const batchPromises = batch.map((url) => this.scrapeUrl(url, request));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          allItems.push(...result.value);
        } else if (result.status === 'rejected') {
          this.logger.error(`Scraping failed: ${result.reason}`);
        }
      }
    }

    this.logger.log(`Scrapling collected ${allItems.length} items`);
    return allItems;
  }

  private async scrapeUrl(
    url: string,
    request: DataCollectionRequest,
  ): Promise<RawDataItem[]> {
    try {
      let endpoint = '/scrape';
      const scrapeRequest: any = {
        url,
        fetcher_type: 'stealth',
        headless: true,
        wait_for_network_idle: true,
        timeout: 30,
      };

      // Determine what to extract based on entity type
      if (request.entityType === 'person') {
        endpoint = '/extract/profiles';
      } else if (request.fields?.includes('email') || request.filters?.extractContacts) {
        endpoint = '/extract/contacts';
      } else if (request.filters?.css_selectors) {
        scrapeRequest.css_selectors = request.filters.css_selectors;
      } else {
        // Default: extract common fields
        scrapeRequest.css_selectors = {
          title: 'h1, .title, [class*="title"]',
          description: '.description, [class*="description"]',
          content: 'article, .content, [class*="content"]',
        };
        scrapeRequest.extract_all_links = true;
      }

      const response = await this.httpClient.post(endpoint, scrapeRequest);
      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || 'Scraping failed');
      }

      // Convert scraped data to raw items
      const rawItems = this.convertToRawItems(result.data, url);

      return rawItems;
    } catch (error) {
      this.logger.error(`Failed to scrape ${url}`, error);
      throw error;
    }
  }

  private convertToRawItems(
    scrapedData: Record<string, any>,
    sourceUrl: string,
  ): RawDataItem[] {
    const items: RawDataItem[] = [];

    // If data contains arrays (e.g., multiple profiles), create separate items
    const hasArrayData = Object.values(scrapedData).some(
      (v) => Array.isArray(v) && v.length > 0,
    );

    if (hasArrayData) {
      // Find the longest array (usually the main data)
      let maxLength = 0;
      let mainKey = '';
      for (const [key, value] of Object.entries(scrapedData)) {
        if (Array.isArray(value) && value.length > maxLength) {
          maxLength = value.length;
          mainKey = key;
        }
      }

      // Create items from array data
      const mainArray = scrapedData[mainKey] as any[];
      for (let i = 0; i < mainArray.length; i++) {
        const itemData: Record<string, any> = {};

        // Collect data from all fields for this index
        for (const [key, value] of Object.entries(scrapedData)) {
          if (Array.isArray(value) && value[i] !== undefined) {
            itemData[key] = value[i];
          } else if (!Array.isArray(value)) {
            itemData[key] = value; // Single values apply to all items
          }
        }

        items.push({
          source: this.config.id,
          sourceUrl,
          data: itemData,
          confidence: 0.7,
          timestamp: new Date(),
        });
      }
    } else {
      // Single item
      items.push({
        source: this.config.id,
        sourceUrl,
        data: scrapedData,
        confidence: 0.7,
        timestamp: new Date(),
      });
    }

    return items;
  }

  private extractUrls(request: DataCollectionRequest): string[] {
    const urls: string[] = [];

    if (request.filters?.url) {
      urls.push(request.filters.url);
    }

    if (request.filters?.urls && Array.isArray(request.filters.urls)) {
      urls.push(...request.filters.urls);
    }

    if (request.filters?.website) {
      urls.push(request.filters.website);
    }

    return urls.filter((url) => url && url.startsWith('http'));
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error('Scrapling service health check failed', error);
      return false;
    }
  }
}
