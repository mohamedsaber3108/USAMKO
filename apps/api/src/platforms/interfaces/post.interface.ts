// Post interfaces for social media platforms

export interface PostContent {
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link' | 'carousel';
  link?: string;
  title?: string;
  description?: string;
  image?: string;
  caption?: string;
  tags?: string[];
  location?: string;
  metadata?: Record<string, any>;
}

export interface ListPostsOptions {
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'draft' | 'published' | 'failed';
}

export interface PostResponse {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  publishedAt?: Date;
  status: 'draft' | 'published' | 'failed';
  error?: string;
  platformId?: string;
  platformPostId?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}