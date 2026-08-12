// Facebook adapter for social media integration using Graph API v18.0

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform } from '../platform.model';
import { BasePostAdapter } from './base.adapter';
import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from '../interfaces/post.interface';

export interface FacebookPostOptions {
  message?: string;
  link?: string;
  picture?: string;
  name?: string;
  description?: string;
  place?: string;
  tags?: string[];
  published?: boolean;
  scheduled_publish_time?: string;
  backdated_time?: string;
  privacy?: { value?: string; description?: string; friends?: string; allow?: string; deny?: string };
}

export interface FacebookMediaUpload {
  url?: string;
  filename?: string;
  caption?: string;
  is_video?: boolean;
}

export interface FacebookPost {
  id: string;
  message?: string;
  link?: string;
  picture?: string;
  created_time: string;
  from: { id: string; name: string; picture?: { data: { url: string } } };
  privacy?: { value?: string };
  properties?: Array<{ name: string; text: string }>;
  type?: string;
  object_id?: string;
}

export interface FacebookMediaResponse {
  id: string;
  post_id?: string;
}

@Injectable()
export class FacebookAdapter extends BasePostAdapter {
  private readonly graphVersion = 'v18.0';
  private readonly graphApiUrl = 'https://graph.facebook.com';
  private readonly pageId: string;

  constructor(account: PlatformAccount, options?: any) {
    super(account, options);
    this.pageId = account.accountId || account.username || '';
  }

  /**
   * Create the API client for Facebook
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
   * Get the page ID for posting
   */
  private getPageId(): string {
    if (!this.pageId) {
      throw new BadRequestException('Facebook Page ID is required');
    }
    return this.pageId;
  }

  /**
   * Create a Facebook post with text, images, videos, or links
   */
  async createPost(content: PostContent): Promise<PostResponse> {
    this.validatePostContent(content);
    this.setAuthorizationHeader();

    try {
      const endpoint = `/${this.getPageId()}/feed`;
      const accessToken = this.getAccessToken();

      // Build post payload
      const postData: Record<string, any> = {
        message: content.text,
        access_token: accessToken,
      };

      // Handle media attachments (images, videos)
      if (content.mediaUrl || content.image) {
        const mediaUrl = content.mediaUrl || content.image;
        
        // Check if it's a video
        if (content.mediaType === 'video' || (content.metadata?.is_video)) {
          postData.url = mediaUrl;
          postData.description = content.description || content.text;
        } else {
          // Image or link
          postData.link = mediaUrl;
          if (content.title) postData.name = content.title;
          if (content.description) postData.description = content.description;
          if (content.image) postData.picture = content.image;
        }
      }

      // Handle link posts
      if (content.link && !content.mediaUrl) {
        postData.link = content.link;
        if (content.title) postData.name = content.title;
        if (content.description) postData.description = content.description;
      }

      // Handle scheduled posts
      if (content.metadata?.scheduled_publish_time) {
        postData.scheduled_publish_time = content.metadata.scheduled_publish_time;
        postData.published = false;
      }

      // Handle privacy settings
      if (content.metadata?.privacy) {
        postData.privacy = JSON.stringify(content.metadata.privacy);
      }

      // Handle place tagging
      if (content.location) {
        postData.place = content.location;
      }

      // Handle tags
      if (content.tags && content.tags.length > 0) {
        postData.tags = content.tags.join(',');
      }

      // Make the API call
      const response = await this.api.post(endpoint, postData);

      // Handle media upload for images/videos (if not using link)
      if (!content.mediaUrl && (content.image || content.metadata?.media)) {
        const mediaResponse = await this.uploadMedia(content);
        if (mediaResponse && mediaResponse.id) {
          // Re-post with media attachment
          const mediaPostData: Record<string, any> = {
            attachment_id: mediaResponse.id,
            access_token: accessToken,
          };
          if (content.text) mediaPostData.message = content.text;
          
          const mediaPostResponse = await this.api.post(endpoint, mediaPostData);
          return this.mapFacebookPostToResponse(mediaPostResponse.data);
        }
      }

      return this.mapFacebookPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to create Facebook post');
    }
  }

  /**
   * Upload media (image/video) to Facebook
   */
  async uploadMedia(content: PostContent): Promise<FacebookMediaResponse | null> {
    try {
      const mediaUrl = content.image || content.mediaUrl;
      if (!mediaUrl) return null;

      const endpoint = `/${this.getPageId()}/photos`;
      const accessToken = this.getAccessToken();

      const formData = new FormData();
      formData.append('url', mediaUrl);
      formData.append('access_token', accessToken);

      if (content.caption) formData.append('caption', content.caption);
      if (content.metadata?.published === false) formData.append('published', 'false');

      const response = await this.api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    } catch (error: any) {
      console.error('Facebook media upload error:', error.response?.data || error.message);
      return null;
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
          fields: 'id,message,link,picture,created_time,from,privacy,type,object_id',
          access_token: this.getAccessToken(),
        },
      });

      return this.mapFacebookPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to get Facebook post');
    }
  }

  /**
   * List posts with optional filtering and pagination
   */
  async listPosts(options?: ListPostsOptions): Promise<PostResponse[]> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/${this.getPageId()}/feed`, {
        params: {
          fields: 'id,message,link,picture,created_time,from,privacy,type',
          limit: options?.limit || 25,
          access_token: this.getAccessToken(),
        },
      });

      return response.data.data?.map((post: FacebookPost) => this.mapFacebookPostToResponse(post)) || [];
    } catch (error: any) {
      this.handleApiError(error, 'Failed to list Facebook posts');
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
      this.handleApiError(error, 'Failed to delete Facebook post');
    }
  }

  /**
   * Refresh access token if expired
   * Uses long-lived token exchange
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.account.refreshToken && !this.account.accessToken) {
      throw new BadRequestException('Access token required for refresh');
    }

    try {
      const response = await this.api.get('/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: 'fb_exchange_token',
          fb_exchange_token: this.account.accessToken,
        },
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }
      
      throw new BadRequestException('Failed to refresh token');
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new UnauthorizedException('Facebook token refresh failed - invalid credentials');
      }
      throw new BadRequestException(`Failed to refresh Facebook token: ${error.message}`);
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return {
      limit: 200, // Facebook Graph API rate limit
      remaining: this.rateLimit.remaining,
      resetAt: this.rateLimit.resetAt,
    };
  }

  /**
   * Map Facebook post to PostResponse
   */
  private mapFacebookPostToResponse(post: FacebookPost): PostResponse {
    return {
      id: post.id,
      content: post.message || '',
      mediaUrl: post.picture || post.link,
      mediaType: post.type === 'video' ? 'video' : post.type === 'photo' ? 'image' : 'link',
      publishedAt: post.created_time ? new Date(post.created_time) : undefined,
      status: 'published',
      platformId: this.account.id,
      platformPostId: post.id,
      metadata: {
        privacy: post.privacy,
        type: post.type,
        objectId: post.object_id,
      },
    };
  }

  /**
   * Get the platform name
   */
  protected getAccountPlatform(): string {
    return SocialPlatform.FACEBOOK;
  }
}