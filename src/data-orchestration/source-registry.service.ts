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

  registerSource(source: DataSourceAdapter): void {
    this.sources.set(source.slug, source);
    this.logger.log(`Registered data source: ${source.name} (${source.slug})`);
  }

  async getSource(slug: string): Promise<DataSourceAdapter | null> {
    return this.sources.get(slug) || null;
  }

  async getAllSources(): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: { enabled: true },
      orderBy: { quality: 'desc' },
    });
  }

  async getSourcesByType(type: SourceType): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: {
        enabled: true,
        type,
      },
    });
  }

  async getSourcesByCapability(capability: string): Promise<DataSource[]> {
    return this.prisma.dataSource.findMany({
      where: {
        enabled: true,
        capabilities: { has: capability },
      },
    });
  }

  private async initializeDefaultSources(): Promise<void> {
    const sources = [
      {
        slug: 'linkedin',
        name: 'LinkedIn',
        provider: 'linkedin',
        type: SourceType.SOCIAL_PLATFORM,
        capabilities: ['discover', 'collect', 'enrich'],
        costPerQuery: 0,
        quality: 0.9,
        rateLimit: 100,
        enabled: true,
      },
      {
        slug: 'linkout',
        name: 'Linkout Email Finder',
        provider: 'linkout',
        type: SourceType.EMAIL_FINDER,
        capabilities: ['enrich'],
        costPerQuery: 0,
        quality: 0.85,
        rateLimit: 1000,
        enabled: true,
      },
      {
        slug: 'google_maps',
        name: 'Google Maps',
        provider: 'google',
        type: SourceType.MAP_SERVICE,
        capabilities: ['discover', 'collect'],
        costPerQuery: 0.017,
        quality: 0.95,
        rateLimit: 100,
        requiresAuth: true,
        enabled: false,
      },
      {
        slug: 'web_scraper',
        name: 'Web Scraper',
        provider: 'internal',
        type: SourceType.WEB_SCRAPER,
        capabilities: ['extract', 'collect'],
        costPerQuery: 0,
        quality: 0.7,
        rateLimit: 50,
        enabled: true,
      },
      {
        slug: 'github',
        name: 'GitHub',
        provider: 'github',
        type: SourceType.WEB_SCRAPER,
        capabilities: ['discover', 'collect', 'enrich'],
        costPerQuery: 0,
        quality: 0.8,
        rateLimit: 60,
        enabled: true,
      },
    ];

    for (const source of sources) {
      await this.prisma.dataSource.upsert({
        where: { slug: source.slug },
        update: {
          name: source.name,
          provider: source.provider,
          type: source.type,
          capabilities: source.capabilities,
          costPerQuery: source.costPerQuery,
          quality: source.quality,
          rateLimit: source.rateLimit,
          enabled: source.enabled,
        },
        create: source,
      });
    }

    this.logger.log(`Initialized ${sources.length} default data sources`);
  }

  async setSourceEnabled(slug: string, enabled: boolean): Promise<void> {
    await this.prisma.dataSource.update({
      where: { slug },
      data: { enabled },
    });

    this.logger.log(`Source ${slug} ${enabled ? 'enabled' : 'disabled'}`);
  }

  async updateSourceConfig(slug: string, configSchema: any): Promise<void> {
    await this.prisma.dataSource.update({
      where: { slug },
      data: { configSchema },
    });

    this.logger.log(`Updated config for source: ${slug}`);
  }

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
          ? completed.reduce((sum, q) => sum + (q.latencyMs || 0), 0) / completed.length
          : 0,
      totalCost: queries.reduce((sum, q) => sum + q.cost, 0),
    };
  }

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
    return { allowed: true };
  }
}
