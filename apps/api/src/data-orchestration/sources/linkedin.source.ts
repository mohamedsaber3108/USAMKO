import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  SourceConfig,
  SourceType,
  SourceCapability,
  DataCollectionRequest,
  RawDataItem,
} from './source.interface';
import { LinkedInService } from '../../../../../src/linkedin/linkedin.service';

/**
 * LinkedIn Data Source - Simplified version
 * Adapter for existing LinkedIn service
 */
@Injectable()
export class LinkedInDataSource extends DataSource {
  private readonly logger = new Logger(LinkedInDataSource.name);

  config: SourceConfig = {
    id: 'linkedin',
    name: 'LinkedIn',
    type: SourceType.API,
    capabilities: [
      SourceCapability.SEARCH,
      SourceCapability.PROFILE_EXTRACTION,
    ],
    priority: 10,
    reliability: 0.85,
    enabled: true,
    requiresAuth: true,
    requiresBrowser: false,
    supportsProxy: false,
    supportsConcurrency: true,
    costPerRequest: 0,
    rateLimit: { requests: 10, period: 'minute' as const },
    averageLatency: 2000,
  };

  constructor(private readonly linkedInService: LinkedInService) {
    super();
  }

  canHandle(request: DataCollectionRequest): boolean {
    // Can handle if entityType is person or query mentions linkedin
    return (
      request.entityType === 'person' ||
      request.query.toLowerCase().includes('linkedin')
    );
  }

  async estimate(request: DataCollectionRequest): Promise<{
    estimatedResults: number;
    estimatedTime: number;
    estimatedCost: number;
  }> {
    return {
      estimatedResults: Math.min(request.maxResults || 10, 100),
      estimatedTime: 5000,
      estimatedCost: 0,
    };
  }

  async collect(request: DataCollectionRequest): Promise<RawDataItem[]> {
    try {
      this.logger.log(`Collecting from LinkedIn: ${request.query}`);

      // Use existing searchAndSave method
      const results = await this.linkedInService.searchAndSave(
        request.tenantId,
        request.userId || 'system',
        {
          keywords: request.query,
          location: request.location,
          title: request.filters?.title,
          company: request.filters?.company,
          limit: request.maxResults || 10,
        }
      );

      // Convert to RawDataItem format
      return results.map((profile) => ({
        source: this.config.id,
        sourceUrl: profile.profileUrl || `https://linkedin.com/in/${profile.publicIdentifier}`,
        data: {
          fullName: `${profile.firstName} ${profile.lastName}`.trim(),
          firstName: profile.firstName,
          lastName: profile.lastName,
          title: profile.headline,
          location: profile.location,
          profileUrl: profile.profileUrl,
          linkedinUrl: profile.profileUrl,
          imageUrl: profile.photoUrl,
          publicIdentifier: profile.publicIdentifier,
        },
        confidence: 0.9,
        timestamp: new Date(),
        metadata: {
          profileId: profile.publicIdentifier,
        },
      }));
    } catch (error) {
      this.logger.error('LinkedIn collection failed:', error);
      // Return empty array instead of throwing to allow other sources to run
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Just check if the service is available
      return !!this.linkedInService;
    } catch {
      return false;
    }
  }

  private buildSearchQuery(request: DataCollectionRequest): string {
    let query = request.query;

    if (request.filters?.title) {
      query += ` title:"${request.filters.title}"`;
    }
    if (request.filters?.company) {
      query += ` company:"${request.filters.company}"`;
    }
    if (request.location) {
      query += ` location:"${request.location}"`;
    }

    return query;
  }
}
