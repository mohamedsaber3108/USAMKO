// Platform models

export enum SocialPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  WHATSAPP = 'WHATSAPP',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  TELEGRAM = 'TELEGRAM',
  PINTEREST = 'PINTEREST',
  REDDIT = 'REDDIT',
}

export enum AccountStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}

export interface PlatformAccount {
  id: string;
  tenantId: string;
  userId: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  cookies?: any;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformPost {
  id: string;
  platformAccountId: string;
  platformPostId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  status: 'draft' | 'published' | 'failed';
  error?: string;
  publishedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PlatformConnector {
  platform: SocialPlatform;
  connect(account: PlatformAccount): Promise<void>;
  disconnect(account: PlatformAccount): Promise<void>;
  post(content: PlatformPost): Promise<PlatformPost>;
  getPosts(accountId: string, limit?: number): Promise<PlatformPost[]>;
  getProfile(accountId: string): Promise<any>;
}