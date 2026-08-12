// Twitter/X adapter for social media integration using API v2

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform } from '../platform.model';
import { BasePostAdapter } from './base.adapter';
import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from '../interfaces/post.interface';

export interface TwitterPostOptions {
  media_ids?: string[];
  reply_to?: string;
  quote_tweet_id?: string;
  poll?: {
    options: string[];
    duration_minutes?: number;
  };
  geo?: {
    place_id: string;
  };
}

export interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  in_reply_to_user_id?: string;
  quote_tweet_id?: string;
}

export interface TwitterMediaUploadResponse {
  media_key: string;
  media_id: string;
  size: number;
  expires_after_secs: number;
  processing_info?: {
    state: string;
    check_after_secs?: number;
  };
}

export interface TwitterUploadResponse {
  media: {
    media_id: string;
    media_id_string: string;
  };
}

@Injectable()
export class TwitterAdapter extends BasePostAdapter {
  private readonly apiVersion = '2';
  private readonly twitterApiUrl = 'https://api.twitter.com';
  private readonly userId: string;

  constructor(account: PlatformAccount, options?: any) {
    super(account, options);
    this.userId = account.accountId || account.username || '';
  }

  /**
   * Create the API client for Twitter
   */
  protected createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: this.twitterApiUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'USAMKO/v2',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validate tweet content (max 280 characters)
   */
  private validateTweetLength(text: string): void {
    if (!text) return;
    
    // Remove URLs from count (they count as 23 chars each)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = text.replace(urlRegex, 'x'.repeat(23));
    
    if (textWithoutUrls.length > 280) {
      throw new BadRequestException('Twitter posts are limited to 280 characters');
    }
  }

  /**
   * Upload media to Twitter
   */
  async uploadMedia(mediaUrl: string, mediaType: 'image' | 'video' | 'gif'): Promise<string | null> {
    try {
      // For now, we'll use the simple URL-based upload
      // In production, you would download the media and upload it in chunks
      const endpoint = '/2/media/upload';
      const accessToken = this.getAccessToken();

      // Twitter v2 API requires base64 or URL-based upload
      // For simplicity, we'll use the URL method
      const response = await this.api.post(
        endpoint,
        {
          media: {
            media_url: mediaUrl,
            tag: mediaType,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.media?.media_id || response.data.media_id;
    } catch (error: any) {
      console.error('Twitter media upload error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create a Twitter tweet with text, images, videos, or GIFs
   */
  async createPost(content: PostContent): Promise<PostResponse> {
    this.validatePostContent(content);
    this.setAuthorizationHeader();

    try {
      const endpoint = '/2/tweets';
      const accessToken = this.getAccessToken();

      // Validate tweet length
      this.validateTweetLength(content.text);

      // Build tweet payload
      const tweetData: Record<string, any> = {
        text: content.text,
      };

      // Handle media attachments (images, videos, GIFs)
      if (content.mediaUrl || content.image) {
        const mediaUrl = content.mediaUrl || content.image || '';
        const mediaType = (content.mediaType as 'image' | 'video' | 'gif') || 'image';
        
        const mediaId = await this.uploadMedia(mediaUrl, mediaType);
        if (mediaId) {
          tweetData.media = {
            media_ids: [mediaId],
          };
        }
      }

      // Handle poll posts
      if (content.metadata?.poll) {
        tweetData.poll = {
          options: content.metadata.poll.options.map((opt: any) => ({
            label: opt.label || opt,
            position: opt.position || 0,
          })),
          duration_minutes: content.metadata.poll.duration_minutes || 60,
        };
      }

      // Handle location tagging
      if (content.location) {
        tweetData.geo = {
          place_id: content.location,
        };
      }

      // Handle reply threads
      if (content.metadata?.reply_to) {
        tweetData.reply = {
          in_reply_to_tweet_id: content.metadata.reply_to,
        };
      }

      // Handle quote tweets
      if (content.metadata?.quote_tweet_id) {
        tweetData.quote_tweet_id = content.metadata.quote_tweet_id;
      }

      // Make the API call
      const response = await this.api.post(endpoint, tweetData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return this.mapTwitterPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to create Twitter post');
    }
  }

  /**
   * Get a tweet by ID
   */
  async getPost(postId: string): Promise<PostResponse> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/2/tweets/${postId}`, {
        params: {
          'tweet.fields': 'created_at,author_id,public_metrics,attachments,in_reply_to_user_id,quote_tweet_id',
          'expansions': 'author_id,attachments.media_keys',
        },
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });

      return this.mapTwitterPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to get Twitter post');
    }
  }

  /**
   * List user tweets with optional filtering and pagination
   */
  async listPosts(options?: ListPostsOptions): Promise<PostResponse[]> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/2/users/${this.userId}/tweets`, {
        params: {
          'max_results': options?.limit || 10,
          'tweet.fields': 'created_at,author_id,public_metrics,attachments,in_reply_to_user_id,quote_tweet_id',
          'pagination_token': options?.after,
        },
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });

      return response.data.data?.map((post: TwitterPost) => this.mapTwitterPostToResponse(post)) || [];
    } catch (error: any) {
      this.handleApiError(error, 'Failed to list Twitter posts');
    }
  }

  /**
   * Delete a tweet by ID
   */
  async deletePost(postId: string): Promise<void> {
    this.setAuthorizationHeader();

    try {
      await this.api.delete(`/2/tweets/${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });
    } catch (error: any) {
      this.handleApiError(error, 'Failed to delete Twitter post');
    }
  }

  /**
   * Refresh access token if expired
   * Uses Twitter OAuth2 refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.account.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }

    try {
      const response = await this.api.post(
        '/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: this.account.refreshToken,
          client_id: process.env.TWITTER_API_KEY,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Twitter token refresh failed - invalid credentials');
      }
      throw new BadRequestException(`Failed to refresh Twitter token: ${error.message}`);
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return {
      limit: 1000, // Twitter API v2 rate limit
      remaining: this.rateLimit.remaining,
      resetAt: this.rateLimit.resetAt,
    };
  }

  /**
   * Map Twitter post to PostResponse
   */
  private mapTwitterPostToResponse(post: TwitterPost): PostResponse {
    return {
      id: post.id,
      content: post.text,
      mediaUrl: undefined,
      mediaType: 'text',
      publishedAt: post.created_at ? new Date(post.created_at) : undefined,
      status: 'published',
      platformId: this.account.id,
      platformPostId: post.id,
      metadata: {
        authorId: post.author_id,
        publicMetrics: post.public_metrics,
        attachments: post.attachments,
        inReplyToUserId: post.in_reply_to_user_id,
        quoteTweetId: post.quote_tweet_id,
      },
    };
  }

  /**
   * Get the platform name
   */
  protected getAccountPlatform(): string {
    return SocialPlatform.TWITTER;
  }
}