export enum CampaignType {
  POST = 'post',
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MESSAGE = 'message',
  STORY = 'story',
  BULK_POST = 'bulk_post',
  BULK_MESSAGE = 'bulk_message',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface CampaignConfig {
  platforms: string[]; // ['facebook', 'instagram', 'twitter']
  content: {
    text?: string;
    mediaUrls?: string[];
    link?: string;
    hashtags?: string[];
  };
  targeting?: {
    accounts?: string[]; // Specific account IDs
    keywords?: string[];
    hashtags?: string[];
    locations?: string[];
  };
  schedule?: {
    startAt?: Date;
    endAt?: Date;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
    interval?: number; // minutes between posts
    times?: string[]; // ['09:00', '12:00', '18:00']
  };
  limits?: {
    maxActions?: number; // Max actions per campaign
    maxPerHour?: number; // Rate limit per hour
    maxPerDay?: number; // Rate limit per day
  };
  automation?: {
    useBrowser?: boolean; // Use browser automation vs API
    humanBehavior?: boolean; // Simulate human behavior
    randomDelays?: boolean; // Random delays between actions
    proxyRotation?: boolean; // Use proxy rotation
  };
}

export interface CampaignResult {
  totalActions: number;
  successCount: number;
  failureCount: number;
  skipCount: number;
  startedAt: Date;
  completedAt?: Date;
  errors?: Array<{
    platform: string;
    error: string;
    timestamp: Date;
  }>;
  details?: {
    [platform: string]: {
      success: number;
      failed: number;
      skipped: number;
      postIds?: string[];
    };
  };
}

export interface CampaignExecution {
  id: string;
  campaignId: string;
  status: CampaignStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: Partial<CampaignResult>;
  currentAction?: number;
  totalActions?: number;
  errors?: string[];
}
