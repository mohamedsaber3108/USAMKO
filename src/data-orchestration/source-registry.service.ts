import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataSource, SourceType } from '@prisma/client';
import { UnifiedRecord, DataSourceResult } from './orchestrator.service';

export interface DataSourceAdapter {
  id: string;
  slug: string;
  name: string;
  type: SourceType;
  capabilities: string[];
  costPerQuery: number;
  quality: number;
  rateLimit?: { requests: number; windowMs: number };

  discover(params: any): Promise<DataSourceResult>;
  collect(params: any): Promise<DataSourceResult>;
  extract(params: any): Promise<DataSourceResult>;
  enrich(record: UnifiedRecord): Promise<Partial<UnifiedRecord>>;
  enrichBatch(records: UnifiedRecord[]): Promise<UnifiedRecord[]>;
  estimateCost(operation: string, params: any): number;
  checkRateLimit(): Promise<{ allowed: boolean; resetAt?: Date }>;
}

@Injectable()
export class SourceRegistryService implements OnModuleInit {
  private readonly logger = new Logger(SourceRegistryService.name);
  private sources: Map<string, DataSourceAdapter> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDefaultSources();
  }

  /**
   * Register a data source
   */
  registerSource(source: DataSourceAdapter): void {
    this.sources.set(source.slug, source);
    this.logger.log(`Registered data source: ${source.name} (${source.slug})`);
  }

  /**
   * Get data source by slug
   */
  async getSource(slug: string): Promise<DataSourceAdapter | null> {
    return this.sources.get(slug) || null;
  }

  /**
   * Get all registered sources
   */
  async getAllSources(): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: { enabled: true },
      orderBy: { quality: 'desc' },
    });
  }

  /**
   * Get sources by type
   */
  async getSourcesByType(type: SourceType): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: {
        enabled: true,
        type,
      },
    });
  }

  /**
   * Get sources by capability
   */
  async getSourcesByCapability(capability: string): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: {
        enabled: true,
        capabilities: { has: capability },
      },
    });
  }

  /**
   * Initialize default data sources in database
   */
  private async initializeDefaultSources(): Promise<void> {
    const sources = [
      {
        slug: 'linkedin',
        name: 'LinkedIn',
        type: SourceType.SOCIAL_PLATFORM,
        description: 'Professional network for finding people and companies',
        capabilities: ['discover', 'collect', 'enrich'],
        costPerQuery: 0,
        quality: 0.9,
        rateLimitRequests: 100,
        rateLimitWindowMs: 3600000, // 1 hour
        enabled: true,
        config: {
          baseUrl: 'https://www.linkedin.com',
          useScraping: true,
        },
      },
      {
        slug: 'linkout',
        name: 'Linkout Email Finder',
        type: SourceType.EMAIL_FINDER,
        description: '100% FREE email finding with 85% success rate',
        capabilities: ['enrich'],
        costPerQuery: 0,
        quality: 0.85,
        rateLimitRequests: 1000,
        rateLimitWindowMs: 3600000,
        enabled: true,
        config: {
          methods: [
            'pattern_matching',
            'clearbit',
            'website_scraping',
            'github',
            'emailrep',
          ],
        },
      },
      {
        slug: 'google_maps',
        name: 'Google Maps',
        type: SourceType.MAP_SERVICE,
        description: 'Find businesses and locations',
        capabilities: ['discover', 'collect'],
        costPerQuery: 0.017, // $17 per 1000 requests
        quality: 0.95,
        rateLimitRequests: 100,
        rateLimitWindowMs: 1000,
        enabled: false, // Requires API key
        config: {
          requiresApiKey: true,
        },
      },
      {
        slug: 'web_scraper',
        name: 'Web Scraper',
        type: SourceType.WEB_SCRAPER,
        description: 'Generic web scraping for any website',
        capabilities: ['extract', 'collect'],
        costPerQuery: 0,
        quality: 0.7,
        rateLimitRequests: 50,
        rateLimitWindowMs: 60000,
        enabled: true,
        config: {
          userAgent: 'Mozilla/5.0 (compatible; USAMKObot/1.0)',
        },
      },
      {
        slug: 'github',
        name: 'GitHub',
        type: SourceType.DEVELOPER_PLATFORM,
        description: 'Find developers and projects',
        capabilities: ['discover', 'collect', 'enrich'],
        costPerQuery: 0,
        quality: 0.8,
        rateLimitRequests: 60,
        rateLimitWindowMs: 3600000,
        enabled: true,
        config: {
          baseUrl: 'https://api.github.com',
        },
      },
    ];

    for (const source of sources) {
      await this.prisma.dataSource.upsert({
        where: { slug: source.slug },
        update: source,
        create: source,
      });
    }

    this.logger.log(`Initialized ${sources.length} default data sources`);
  }

  /**
   * Enable/disable source
   */
  async setSourceEnabled(slug: string, enabled: boolean): Promise<void> {
    await this.prisma.dataSource.update({
      where: { slug },
      data: { enabled },
    });

    this.logger.log(`Source ${slug} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update source config
   */
  async updateSourceConfig(slug: string, config: any): Promise<void> {
    await this.prisma.dataSource.update({
      where: { slug },
      data: { config },
    });

    this.logger.log(`Updated config for source: ${slug}`);
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(slug: string, period: 'day' | 'week' | 'month' = 'month') {
    const startDate = this.getStartDate(period);

    const queries = await this.prisma.dataQuery.findMany({
      where: {
        source: { slug },
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        resultCount: true,
        latencyMs: true,
        cost: true,
      },
    });

    const completed = queries.filter((q) => q.status === 'COMPLETED');

    return {
      totalQueries: queries.length,
      completedQueries: completed.length,
      successRate:
        queries.length > 0 ? (completed.length / queries.length) * 100 : 0,
      totalResults: completed.reduce((sum, q) => sum + (q.resultCount || 0), 0),
      averageLatency:
        completed.length > 0
          ? completed.reduce((sum, q) => sum + q.latencyMs, 0) / completed.length
          : 0,
      totalCost: queries.reduce((sum, q) => sum + q.cost, 0),
    };
  }

  /**
   * Get all source statistics
   */
  async getAllSourceStatistics(period: 'day' | 'week' | 'month' = 'month') {
    const sources = await this.getAllSources();

    const stats = await Promise.all(
      sources.map(async (source) => ({
        source: {
          slug: source.slug,
          name: source.name,
          type: source.type,
        },
        stats: await this.getSourceStatistics(source.slug, period),
      })),
    );

    return stats;
  }

  /**
   * Helper: Get start date for period
   */
  private getStartDate(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setDate(now.getDate() - 30));
    }
  }
}

/**
 * Base class for data source adapters
 */
export abstract class BaseDataSource implements DataSourceAdapter {
  abstract id: string;
  abstract slug: string;
  abstract name: string;
  abstract type: SourceType;
  abstract capabilities: string[];
  abstract costPerQuery: number;
  abstract quality: number;

  async discover(params: any): Promise<DataSourceResult> {
    throw new Error(`${this.name} does not support discover operation`);
  }

  async collect(params: any): Promise<DataSourceResult> {
    throw new Error(`${this.name} does not support collect operation`);
  }

  async extract(params: any): Promise<DataSourceResult> {
    throw new Error(`${this.name} does not support extract operation`);
  }

  async enrich(record: UnifiedRecord): Promise<Partial<UnifiedRecord>> {
    throw new Error(`${this.name} does not support enrich operation`);
  }

  async enrichBatch(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    // Default batch implementation - enrich one by one
    const enriched = await Promise.all(
      records.map(async (record) => {
        const enrichment = await this.enrich(record);
        return { ...record, ...enrichment };
      }),
    );
    return enriched;
  }

  estimateCost(operation: string, params: any): number {
    return this.costPerQuery;
  }

  async checkRateLimit(): Promise<{ allowed: boolean; resetAt?: Date }> {
    // Default: always allowed
    return { allowed: true };
  }
}
