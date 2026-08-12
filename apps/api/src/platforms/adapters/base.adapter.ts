// Base adapter class for social media platforms

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform, AccountStatus } from '../platform.model';
import { IPostAdapter, AdapterOptions } from '../interfaces/adapter.interface';
import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from '../interfaces/post.interface';

/**
 * Base adapter class that all platform adapters should extend
 */
@Injectable()
export abstract class BasePostAdapter implements IPostAdapter {
  /**
   * HTTP client instance
   */
  protected api: AxiosInstance;

  /**
   * Platform account
   */
  protected account: PlatformAccount;

  /**
   * Adapter options
   */
  protected options: AdapterOptions;

  /**
   * Platform name
   */
  protected readonly platform: string;

  /**
   * Rate limit tracking
   */
  protected rateLimit: {
    limit: number;
    remaining: number;
    resetAt: Date;
  } = {
    limit: 1000,
    remaining: 1000,
    resetAt: new Date(),
  };

  constructor(account: PlatformAccount, options?: AdapterOptions) {
    this.account = account;
    this.options = options || {};
    this.platform = this.getAccountPlatform();
    this.api = this.createApiClient();
  }

  /**
   * Create the API client for the platform
   */
  protected createApiClient(): AxiosInstance {
    return axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'USAMKO/v2',
      },
    });
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
      throw new BadRequestException('Access token is required but not available');
    }
    return this.account.accessToken;
  }

  /**
   * Check if the account is connected
   */
  protected isAccountConnected(): boolean {
    return (this.account.status as any) === AccountStatus.CONNECTED;
  }

  /**
   * Validate post content before sending to platform
   */
  protected validatePostContent(content: PostContent): void {
    if (!content.text || content.text.trim().length === 0) {
      throw new BadRequestException('Post content cannot be empty');
    }
  }

  /**
   * Set authorization header for API requests
   */
  protected setAuthorizationHeader(): void {
    if (this.account.accessToken) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.account.accessToken}`;
    }
  }

  /**
   * Handle API errors and throw appropriate exceptions
   */
  protected handleApiError(error: any, context: string = 'API request'): never {
    if (error.response?.data?.error) {
      const errorMessage = error.response.data.error.message || error.response.data.error;
      throw new BadRequestException(`${context}: ${errorMessage}`);
    }
    if (error.response?.status === 404) {
      throw new NotFoundException(`${context}: Resource not found`);
    }
    if (error.response?.status === 401) {
      throw new BadRequestException(`${context}: Unauthorized - check your access token`);
    }
    if (error.response?.status === 429) {
      throw new BadRequestException(`${context}: Rate limit exceeded`);
    }
    throw error;
  }

  /**
   * Parse rate limit headers from response
   */
  protected parseRateLimitHeaders(headers: any): void {
    if (headers) {
      this.rateLimit.limit = parseInt(headers['x-rate-limit-limit'] || headers['x-ratelimit-limit'] || '1000', 10);
      this.rateLimit.remaining = parseInt(headers['x-rate-limit-remaining'] || headers['x-ratelimit-remaining'] || '1000', 10);
      
      const resetAt = headers['x-rate-limit-reset'] || headers['x-ratelimit-reset'];
      if (resetAt) {
        this.rateLimit.resetAt = new Date(parseInt(resetAt) * 1000);
      }
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): Promise<RateLimitInfo> {
    return Promise.resolve({
      limit: this.rateLimit.limit,
      remaining: this.rateLimit.remaining,
      resetAt: this.rateLimit.resetAt,
    });
  }

  /**
   * Get the platform account associated with this adapter
   */
  getAccount(): PlatformAccount {
    return this.account;
  }

  /**
   * Create a new post on the platform
   */
  abstract createPost(content: PostContent): Promise<PostResponse>;

  /**
   * Get a specific post by ID
   */
  abstract getPost(postId: string): Promise<PostResponse>;

  /**
   * List posts with optional filtering and pagination
   */
  abstract listPosts(options?: ListPostsOptions): Promise<PostResponse[]>;

  /**
   * Delete a post by ID
   */
  abstract deletePost(postId: string): Promise<void>;

  /**
   * Refresh the access token if expired
   */
  abstract refreshAccessToken?(): Promise<string>;
}