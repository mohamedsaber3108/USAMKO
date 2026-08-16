/**
 * Unified Data Source Interface
 *
 * All data collection sources must implement this interface to participate
 * in the multi-source orchestration system.
 */

export enum SourceType {
  WEB_SCRAPING = 'web_scraping',
  API = 'api',
  BROWSER_AUTOMATION = 'browser_automation',
  PLATFORM_INTEGRATION = 'platform_integration',
  DATABASE = 'database',
  FILE = 'file',
}

export enum SourceCapability {
  SEARCH = 'search',
  PROFILE_EXTRACTION = 'profile_extraction',
  LIST_EXTRACTION = 'list_extraction',
  REAL_TIME_MONITORING = 'real_time_monitoring',
  BULK_EXPORT = 'bulk_export',
  EMAIL_DISCOVERY = 'email_discovery',
  PHONE_DISCOVERY = 'phone_discovery',
  COMPANY_RESEARCH = 'company_research',
  LOCATION_BASED = 'location_based',
  RELATIONSHIP_MAPPING = 'relationship_mapping',
}

export interface SourceConfig {
  // Source identification
  id: string;
  name: string;
  type: SourceType;
  capabilities: SourceCapability[];

  // Source characteristics
  requiresAuth: boolean;
  requiresBrowser: boolean;
  supportsProxy: boolean;
  supportsConcurrency: boolean;

  // Rate limits and costs
  rateLimit?: {
    requests: number;
    period: 'second' | 'minute' | 'hour' | 'day';
  };
  costPerRequest?: number;

  // Priority and reliability
  priority: number; // Higher number = higher priority
  reliability: number; // 0-1 score
  averageLatency: number; // milliseconds

  // Configuration
  enabled: boolean;
  config?: Record<string, any>;
}

export interface DataCollectionRequest {
  // What to collect
  query: string;
  entityType: 'person' | 'company' | 'event' | 'place' | 'product' | 'custom';
  fields?: string[];

  // How to collect
  sources?: string[]; // Specific source IDs, or auto-select if empty
  maxResults?: number;
  timeout?: number;

  // Filters
  filters?: Record<string, any>;
  location?: string;
  dateRange?: { start: Date; end: Date };

  // Options
  enrichWithEmail?: boolean;
  enrichWithPhone?: boolean;
  autoScore?: boolean;
  deduplicate?: boolean;
  validate?: boolean;

  // User context
  tenantId: string;
  userId: string;
}

export interface RawDataItem {
  source: string;
  sourceUrl?: string;
  data: Record<string, any>;
  confidence: number; // 0-1 score
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NormalizedDataItem {
  // Universal fields
  id: string;
  entityType: string;

  // Person fields
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  bio?: string;

  // Company fields
  company?: string;
  companyUrl?: string;
  industry?: string;

  // Location fields
  location?: string;
  city?: string;
  country?: string;

  // Online presence
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  website?: string;

  // Additional fields
  sourceUrl?: string;
  imageUrl?: string;
  tags?: string[];
  score?: number;
  verified?: boolean;

  // Metadata
  sources: string[]; // List of source IDs that contributed
  confidence: number;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export interface DataCollectionResult {
  request: DataCollectionRequest;

  // Results
  items: NormalizedDataItem[];
  totalFound: number;
  totalReturned: number;

  // Source breakdown
  sourceResults: {
    sourceId: string;
    found: number;
    used: number;
    discarded: number;
    errors: number;
  }[];

  // Processing stats
  executionTime: number;
  normalized: number;
  deduplicated: number;
  validated: number;
  enriched: number;

  // Status
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  warnings?: string[];
}

/**
 * Abstract base class for all data sources
 */
export abstract class DataSource {
  abstract config: SourceConfig;

  /**
   * Check if this source can handle the given request
   */
  abstract canHandle(request: DataCollectionRequest): boolean;

  /**
   * Estimate the cost and time for this request
   */
  abstract estimate(request: DataCollectionRequest): Promise<{
    estimatedResults: number;
    estimatedTime: number;
    estimatedCost: number;
  }>;

  /**
   * Execute the data collection
   */
  abstract collect(request: DataCollectionRequest): Promise<RawDataItem[]>;

  /**
   * Health check
   */
  abstract healthCheck(): Promise<boolean>;
}
