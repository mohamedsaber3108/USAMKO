import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  DataSource,
  DataCollectionRequest,
  DataCollectionResult,
  RawDataItem,
  NormalizedDataItem,
  SourceCapability,
} from './sources/source.interface';

/**
 * Multi-Source Data Collection Orchestrator
 *
 * Coordinates data collection across multiple sources:
 * - Source discovery and selection
 * - Parallel execution
 * - Normalization
 * - Deduplication
 * - Validation
 * - Enrichment
 */
@Injectable()
export class DataOrchestrator {
  private readonly logger = new Logger(DataOrchestrator.name);
  private sources: Map<string, DataSource> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Register a data source
   */
  registerSource(source: DataSource) {
    this.sources.set(source.config.id, source);
    this.logger.log(`Registered data source: ${source.config.name} (${source.config.id})`);
  }

  /**
   * Get all available sources
   */
  getAvailableSources(): DataSource[] {
    return Array.from(this.sources.values()).filter((s) => s.config.enabled);
  }

  /**
   * Get sources by capability
   */
  getSourcesByCapability(capability: SourceCapability): DataSource[] {
    return this.getAvailableSources().filter((s) =>
      s.config.capabilities.includes(capability),
    );
  }

  /**
   * Execute multi-source data collection
   */
  async collect(request: DataCollectionRequest): Promise<DataCollectionResult> {
    const startTime = Date.now();
    const result: DataCollectionResult = {
      request,
      items: [],
      totalFound: 0,
      totalReturned: 0,
      sourceResults: [],
      executionTime: 0,
      normalized: 0,
      deduplicated: 0,
      validated: 0,
      enriched: 0,
      status: 'success',
      errors: [],
      warnings: [],
    };

    try {
      // Step 1: Source Selection
      const selectedSources = this.selectSources(request);
      this.logger.log(
        `Selected ${selectedSources.length} sources for request: ${selectedSources.map((s) => s.config.name).join(', ')}`,
      );

      if (selectedSources.length === 0) {
        result.status = 'failed';
        result.errors.push('No suitable sources found for this request');
        return result;
      }

      // Step 2: Parallel Execution
      const rawResults = await this.executeSourcesInParallel(
        selectedSources,
        request,
        result,
      );

      result.totalFound = rawResults.length;

      // Step 3: Normalization
      const normalizedItems = await this.normalizeData(rawResults, request);
      result.normalized = normalizedItems.length;

      // Step 4: Deduplication
      let finalItems = normalizedItems;
      if (request.deduplicate !== false) {
        finalItems = await this.deduplicateData(normalizedItems);
        result.deduplicated = normalizedItems.length - finalItems.length;
      }

      // Step 5: Validation
      if (request.validate !== false) {
        finalItems = await this.validateData(finalItems);
        result.validated = finalItems.length;
      }

      // Step 6: Enrichment
      if (request.enrichWithEmail || request.enrichWithPhone) {
        finalItems = await this.enrichData(finalItems, request);
        result.enriched = finalItems.filter((i) => i.email || i.phone).length;
      }

      // Step 7: Scoring
      if (request.autoScore !== false) {
        finalItems = await this.scoreData(finalItems, request);
      }

      // Step 8: Limit results
      if (request.maxResults && finalItems.length > request.maxResults) {
        finalItems = finalItems.slice(0, request.maxResults);
      }

      result.items = finalItems;
      result.totalReturned = finalItems.length;
      result.status = result.errors.length > 0 ? 'partial' : 'success';
    } catch (error) {
      this.logger.error('Data collection failed', error);
      result.status = 'failed';
      result.errors.push(error.message);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Select appropriate sources based on request
   */
  private selectSources(request: DataCollectionRequest): DataSource[] {
    let sources: DataSource[];

    if (request.sources && request.sources.length > 0) {
      // User specified sources
      sources = request.sources
        .map((id) => this.sources.get(id))
        .filter((s) => s && s.config.enabled);
    } else {
      // Auto-select based on capabilities and entity type
      sources = this.getAvailableSources().filter((s) => s.canHandle(request));
    }

    // Sort by priority and reliability
    sources.sort(
      (a, b) =>
        b.config.priority * b.config.reliability -
        a.config.priority * a.config.reliability,
    );

    return sources;
  }

  /**
   * Execute sources in parallel with error handling
   */
  private async executeSourcesInParallel(
    sources: DataSource[],
    request: DataCollectionRequest,
    result: DataCollectionResult,
  ): Promise<RawDataItem[]> {
    const allResults: RawDataItem[] = [];

    const promises = sources.map(async (source) => {
      const sourceResult = {
        sourceId: source.config.id,
        found: 0,
        used: 0,
        discarded: 0,
        errors: 0,
      };

      try {
        this.logger.log(`Executing source: ${source.config.name}`);
        const items = await source.collect(request);
        sourceResult.found = items.length;
        sourceResult.used = items.length;

        items.forEach((item) => {
          item.source = source.config.id;
        });

        allResults.push(...items);
      } catch (error) {
        this.logger.error(`Source ${source.config.name} failed`, error);
        sourceResult.errors++;
        result.errors.push(`${source.config.name}: ${error.message}`);
      }

      result.sourceResults.push(sourceResult);
    });

    await Promise.all(promises);

    return allResults;
  }

  /**
   * Normalize raw data into unified schema
   */
  private async normalizeData(
    rawItems: RawDataItem[],
    request: DataCollectionRequest,
  ): Promise<NormalizedDataItem[]> {
    return rawItems.map((raw) => this.normalizeItem(raw, request.entityType));
  }

  /**
   * Normalize a single item
   */
  private normalizeItem(
    raw: RawDataItem,
    entityType: string,
  ): NormalizedDataItem {
    const data = raw.data;
    const normalized: NormalizedDataItem = {
      id: this.generateId(raw),
      entityType,
      sources: [raw.source],
      confidence: raw.confidence,
      lastUpdated: raw.timestamp,
      metadata: raw.metadata,
    };

    // Map common fields (flexible mapping based on common patterns)
    normalized.fullName = data.fullName || data.name || data.displayName;
    normalized.firstName = data.firstName || data.first_name;
    normalized.lastName = data.lastName || data.last_name;
    normalized.email = data.email;
    normalized.phone = data.phone || data.phoneNumber || data.phone_number;
    normalized.title = data.title || data.position || data.jobTitle;
    normalized.bio = data.bio || data.summary || data.description;
    normalized.company = data.company?.name || data.company || data.companyName;
    normalized.companyUrl = data.company?.url || data.companyUrl;
    normalized.industry = data.industry;
    normalized.location = data.location || data.city;
    normalized.city = data.city;
    normalized.country = data.country;
    normalized.linkedinUrl = data.linkedinUrl || data.linkedin_url || data.profileUrl;
    normalized.facebookUrl = data.facebookUrl || data.facebook_url;
    normalized.instagramUrl = data.instagramUrl || data.instagram_url;
    normalized.twitterUrl = data.twitterUrl || data.twitter_url;
    normalized.telegramUrl = data.telegramUrl || data.telegram_url;
    normalized.website = data.website || data.url;
    normalized.sourceUrl = raw.sourceUrl || data.sourceUrl || data.url;
    normalized.imageUrl = data.imageUrl || data.avatar || data.profilePicture;
    normalized.tags = data.tags || [];
    normalized.score = data.score;
    normalized.verified = data.verified;

    return normalized;
  }

  /**
   * Deduplicate normalized data
   */
  private async deduplicateData(
    items: NormalizedDataItem[],
  ): Promise<NormalizedDataItem[]> {
    const seen = new Map<string, NormalizedDataItem>();

    for (const item of items) {
      const key = this.generateDeduplicationKey(item);

      if (seen.has(key)) {
        // Merge with existing item (combine sources, update confidence)
        const existing = seen.get(key);
        existing.sources = [...new Set([...existing.sources, ...item.sources])];
        existing.confidence = Math.max(existing.confidence, item.confidence);

        // Merge missing fields
        for (const [k, v] of Object.entries(item)) {
          if (v && !existing[k]) {
            existing[k] = v;
          }
        }
      } else {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate deduplication key
   */
  private generateDeduplicationKey(item: NormalizedDataItem): string {
    // Use multiple fields to identify duplicates
    const parts: string[] = [];

    if (item.email) parts.push(`email:${item.email.toLowerCase()}`);
    if (item.linkedinUrl) parts.push(`linkedin:${item.linkedinUrl}`);
    if (item.fullName && item.company) {
      parts.push(`name_company:${item.fullName.toLowerCase()}_${item.company.toLowerCase()}`);
    }

    return parts.length > 0 ? parts.join('|') : `id:${item.id}`;
  }

  /**
   * Validate data quality
   */
  private async validateData(
    items: NormalizedDataItem[],
  ): Promise<NormalizedDataItem[]> {
    return items.filter((item) => {
      // Basic validation rules
      if (!item.fullName && !item.email && !item.company) return false;
      if (item.confidence < 0.3) return false;

      return true;
    });
  }

  /**
   * Enrich data with additional information
   */
  private async enrichData(
    items: NormalizedDataItem[],
    request: DataCollectionRequest,
  ): Promise<NormalizedDataItem[]> {
    // TODO: Integrate email/phone enrichment services
    // For now, return items as-is
    return items;
  }

  /**
   * Score data relevance
   */
  private async scoreData(
    items: NormalizedDataItem[],
    request: DataCollectionRequest,
  ): Promise<NormalizedDataItem[]> {
    for (const item of items) {
      let score = 0;

      // Base score from confidence
      score += item.confidence * 40;

      // Bonus for having key fields
      if (item.email) score += 20;
      if (item.phone) score += 10;
      if (item.linkedinUrl) score += 10;
      if (item.title) score += 10;
      if (item.company) score += 10;

      item.score = Math.min(100, Math.round(score));
    }

    // Sort by score descending
    items.sort((a, b) => (b.score || 0) - (a.score || 0));

    return items;
  }

  /**
   * Generate unique ID
   */
  private generateId(raw: RawDataItem): string {
    const data = JSON.stringify(raw.data);
    return `${raw.source}_${Buffer.from(data).toString('base64').substring(0, 16)}`;
  }
}
