// Adapter interface for social media platforms

import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from './post.interface';
import { PlatformAccount } from '../platform.model';

/**
 * Base interface for all social media platform adapters
 */
export interface IPostAdapter {
  /**
   * Create a new post on the platform
   */
  createPost(content: PostContent): Promise<PostResponse>;

  /**
   * Get a specific post by ID
   */
  getPost(postId: string): Promise<PostResponse>;

  /**
   * List posts with optional filtering and pagination
   */
  listPosts(options?: ListPostsOptions): Promise<PostResponse[]>;

  /**
   * Delete a post by ID
   */
  deletePost(postId: string): Promise<void>;

  /**
   * Refresh the access token if expired
   * Optional - only needed for platforms that support token refresh
   */
  refreshAccessToken?(): Promise<string>;

  /**
   * Get rate limit information
   */
  getRateLimitInfo?(): Promise<RateLimitInfo>;

  /**
   * Get the platform account associated with this adapter
   */
  getAccount(): PlatformAccount;
}

/**
 * Base adapter options for all adapters
 */
export interface AdapterOptions {
  /**
   * Platform-specific configuration
   */
  config?: Record<string, any>;

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    /**
     * Maximum requests per time window
     */
    maxRequests: number;
    /**
     * Time window in milliseconds
     */
    windowMs: number;
  };
}

/**
 * Base adapter class that all platform adapters should extend
 */
export abstract class BaseAdapter {
  /**
   * Platform name
   */
  protected readonly platform: string;

  /**
   * Platform account
   */
  protected account: PlatformAccount;

  /**
   * Adapter options
   */
  protected options: AdapterOptions;

  constructor(account: PlatformAccount, options?: AdapterOptions) {
    this.account = account;
    this.options = options || {};
    this.platform = this.getAccountPlatform();
  }

  /**
   * Get the platform name
   */
  protected getAccountPlatform(): string {
    return this.account.platform || 'unknown';
  }

  /**
   * Get the access token
   */
  protected getAccessToken(): string {
    if (!this.account.accessToken) {
      throw new Error('Access token is required but not available');
    }
    return this.account.accessToken;
  }

  /**
   * Check if the account is connected
   */
  protected isAccountConnected(): boolean {
    return this.account.status === 'CONNECTED';
  }

  /**
   * Validate post content before sending to platform
   */
  protected validatePostContent(content: PostContent): void {
    if (!content.text || content.text.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }
  }
}