// Instagram adapter for social media integration using Graph API v18.0

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform } from '../platform.model';
import { BasePostAdapter } from './base.adapter';
import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from '../interfaces/post.interface';

export interface InstagramPostOptions {
  caption?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  location_id?: string;
  tags?: string[];
  children?: string[]; // For carousels
  is_reel?: boolean;
  business_media_id?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  children?: { data: Array<{ id: string; media_type: string; media_url?: string }> };
  username?: string;
  ig_user_id?: string;
}

export interface InstagramMediaResponse {
  id: string;
  post_url?: string;
  status_code?: number;
}

@Injectable()
export class InstagramAdapter extends BasePostAdapter {
  private readonly graphVersion = 'v18.0';
  private readonly graphApiUrl = 'https://graph.instagram.com';
  private readonly igUserId: string;

  constructor(account: PlatformAccount, options?: any) {
    super(account, options);
    this.igUserId = account.accountId || account.username || '';
  }

  /**
   * Create the API client for Instagram
   */
  protected createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: this.graphApiUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'USAMKO/v2',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get the Instagram user ID for posting
   */
  private getIgUserId(): string {
    if (!this.igUserId) {
      throw new BadRequestException('Instagram User ID is required');
    }
    return this.igUserId;
  }

  /**
   * Validate hashtags in caption (max 30 per post)
   */
  private validateHashtags(caption: string): void {
    if (!caption) return;
    
    const hashtagCount = (caption.match(/#[a-zA-Z0-9_]+/g) || []).length;
    if (hashtagCount > 30) {
      throw new BadRequestException('Instagram allows maximum 30 hashtags per post');
    }
  }

  /**
   * Create an Instagram post (image, video, carousel, or reel)
   */
  async createPost(content: PostContent): Promise<PostResponse> {
    this.validatePostContent(content);
    this.setAuthorizationHeader();

    try {
      const endpoint = `/${this.getIgUserId()}/media`;
      const accessToken = this.getAccessToken();

      // Validate hashtags
      this.validateHashtags(content.text);

      // Build media payload
      const mediaData: Record<string, any> = {
        caption: content.text,
        access_token: accessToken,
      };

      // Handle media type
      if (content.mediaType === 'video' || (content.metadata?.is_video)) {
        mediaData.media_type = 'VIDEO';
        mediaData.video_url = content.mediaUrl || content.image;
        if (content.metadata?.thumbnail_url) {
          mediaData.thumbnail_url = content.metadata.thumbnail_url;
        }
      } else if (content.mediaType === 'carousel' || (content.metadata && content.metadata.children)) {
        mediaData.media_type = 'CAROUSEL_ALBUM';
        mediaData.children = JSON.stringify(content.metadata.children);
      } else {
        // Default to image
        mediaData.media_type = 'IMAGE';
        mediaData.image_url = content.mediaUrl || content.image;
      }

      // Handle location tagging
      if (content.location) {
        mediaData.location_id = content.location;
      }

      // Handle tags
      if (content.tags && content.tags.length > 0) {
        mediaData.tags = content.tags.join(',');
      }

      // Handle scheduled posts
      if (content.metadata && content.metadata.scheduled_publish_time) {
        mediaData.scheduled_publish_time = content.metadata.scheduled_publish_time;
        mediaData.published = false;
      }

      // Make the API call to create media
      const response = await this.api.post(endpoint, mediaData);

      // If it's a carousel or video, we need to publish it
      if (mediaData.media_type === 'CAROUSEL_ALBUM' || mediaData.media_type === 'VIDEO') {
        const mediaId = response.data.id;
        await this.publishMedia(mediaId, content.text);
        return this.mapInstagramPostToResponse({ ...response.data, id: mediaId });
      }

      return this.mapInstagramPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to create Instagram post');
    }
  }

  /**
   * Publish media (for videos and carousels)
   */
  async publishMedia(mediaId: string, caption?: string): Promise<InstagramMediaResponse> {
    try {
      const endpoint = `/${this.getIgUserId()}/media_publish`;
      const accessToken = this.getAccessToken();

      const publishData: Record<string, any> = {
        creation_id: mediaId,
        access_token: accessToken,
      };

      if (caption) {
        publishData.caption = caption;
      }

      const response = await this.api.post(endpoint, publishData);
      return response.data;
    } catch (error: any) {
      throw new BadRequestException(`Failed to publish Instagram media: ${error.message}`);
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(postId: string): Promise<PostResponse> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/${postId}`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children',
          access_token: this.getAccessToken(),
        },
      });

      return this.mapInstagramPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to get Instagram post');
    }
  }

  /**
   * List posts with optional filtering and pagination
   */
  async listPosts(options?: ListPostsOptions): Promise<PostResponse[]> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/${this.getIgUserId()}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children',
          limit: options?.limit || 25,
          access_token: this.getAccessToken(),
        },
      });

      return response.data.data?.map((post: InstagramPost) => this.mapInstagramPostToResponse(post)) || [];
    } catch (error: any) {
      this.handleApiError(error, 'Failed to list Instagram posts');
    }
  }

  /**
   * Delete a post by ID
   */
  async deletePost(postId: string): Promise<void> {
    this.setAuthorizationHeader();

    try {
      await this.api.delete(`/${postId}`, {
        params: {
          access_token: this.getAccessToken(),
        },
      });
    } catch (error: any) {
      this.handleApiError(error, 'Failed to delete Instagram post');
    }
  }

  /**
   * Refresh access token if expired
   * Uses Instagram long-lived token exchange
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.account.refreshToken && !this.account.accessToken) {
      throw new BadRequestException('Access token required for refresh');
    }

    try {
      const response = await this.api.get('/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: this.account.accessToken,
        },
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }
      
      throw new BadRequestException('Failed to refresh token');
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Instagram token refresh failed - invalid credentials');
      }
      throw new BadRequestException(`Failed to refresh Instagram token: ${error.message}`);
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return {
      limit: 200, // Instagram Graph API rate limit
      remaining: this.rateLimit.remaining,
      resetAt: this.rateLimit.resetAt,
    };
  }

  /**
   * Map Instagram post to PostResponse
   */
  private mapInstagramPostToResponse(post: InstagramPost): PostResponse {
    return {
      id: post.id,
      content: post.caption || '',
      mediaUrl: post.media_url,
      mediaType: post.media_type?.toLowerCase(),
      publishedAt: post.timestamp ? new Date(post.timestamp) : undefined,
      status: 'published',
      platformId: this.account.id,
      platformPostId: post.id,
      metadata: {
        permalink: post.permalink,
        username: post.username,
        igUserId: post.ig_user_id,
        children: post.children,
      },
    };
  }

  /**
   * Get the platform name
   */
  protected getAccountPlatform(): string {
    return SocialPlatform.INSTAGRAM;
  }
}