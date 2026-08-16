import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  SourceConfig,
  SourceType,
  SourceCapability,
  DataCollectionRequest,
  RawDataItem,
} from './source.interface';
import { LinkedInService } from '../../linkedin/linkedin.service';

/**
 * LinkedIn Data Source
 *
 * Adapter for existing LinkedIn service to participate in
 * multi-source orchestration
 */
@Injectable()
export class LinkedInDataSource extends DataSource {
  private readonly logger = new Logger(LinkedInDataSource.name);

  config: SourceConfig = {
    id: 'linkedin',
    name: 'LinkedIn',
    type: SourceType.PLATFORM_INTEGRATION,
    capabilities: [
      SourceCapability.SEARCH,
      SourceCapability.PROFILE_EXTRACTION,
      SourceCapability.COMPANY_RESEARCH,
      SourceCapability.RELATIONSHIP_MAPPING,
    ],
    requiresAuth: true,
    requiresBrowser: true,
    supportsProxy: true,
    supportsConcurrency: true,
    rateLimit: {
      requests: 100,
      period: 'hour',
    },
    priority: 10,
    reliability: 0.85,
    averageLatency: 3000,
    enabled: true,
  };

  constructor(private linkedInService: LinkedInService) {
    super();
  }

  canHandle(request: DataCollectionRequest): boolean {
    // LinkedIn is great for people and company searches
    if (request.entityType === 'person' || request.entityType === 'company') {
      return true;
    }

    // Can also handle searches with location
    if (request.location) {
      return true;
    }

    return false;
  }

  async estimate(request: DataCollectionRequest): Promise<{
    estimatedResults: number;
    estimatedTime: number;
    estimatedCost: number;
  }> {
    return {
      estimatedResults: Math.min(request.maxResults || 100, 100),
      estimatedTime: ((request.maxResults || 100) * this.config.averageLatency) / 10,
      estimatedCost: 0,
    };
  }

  async collect(request: DataCollectionRequest): Promise<RawDataItem[]> {
    try {
      // Build LinkedIn search query
      const searchQuery = this.buildSearchQuery(request);

      // Execute search using existing LinkedIn service
      const searchResults = await this.linkedInService.search({
        query: searchQuery,
        filters: {
          industry: request.filters?.industry,
          location: request.location,
          company: request.filters?.company,
        },
        limit: request.maxResults || 100,
      });

      // Convert to raw data items
      const rawItems: RawDataItem[] = searchResults.map((result) => ({
        source: this.config.id,
        sourceUrl: result.profileUrl || result.url,
        data: {
          fullName: result.name,
          firstName: result.firstName,
          lastName: result.lastName,
          title: result.title,
          company: result.company?.name,
          companyUrl: result.company?.url,
          location: result.location,
          industry: result.industry,
          profileUrl: result.profileUrl,
          linkedinUrl: result.profileUrl,
          imageUrl: result.profilePicture,
          bio: result.summary,
          connections: result.connections,
          premium: result.premium,
        },
        confidence: 0.9,
        timestamp: new Date(),
        metadata: {
          searchQuery,
          profileId: result.publicIdentifier,
        },
      }));

      this.logger.log(`Collected ${rawItems.length} items from LinkedIn`);
      return rawItems;
    } catch (error) {
      this.logger.error('LinkedIn collection failed', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if LinkedIn service is available
      const status = await this.linkedInService.getStatistics();
      return !!status;
    } catch {
      return false;
    }
  }

  private buildSearchQuery(request: DataCollectionRequest): string {
    const parts: string[] = [request.query];

    if (request.filters?.role) {
      parts.push(request.filters.role);
    }

    if (request.filters?.industry) {
      parts.push(request.filters.industry);
    }

    return parts.filter(Boolean).join(' ');
  }
}
