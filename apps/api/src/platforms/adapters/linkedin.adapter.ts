// LinkedIn adapter for social media integration using Marketing API v2

import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform } from '../platform.model';
import { BasePostAdapter } from './base.adapter';
import { PostContent, PostResponse, ListPostsOptions, RateLimitInfo } from '../interfaces/post.interface';

export interface LinkedInPostOptions {
  title?: string;
  description?: string;
  subject?: string;
  category?: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  media?: {
    id: string;
    status: 'READY';
  };
  poll?: {
    options: Array<{ label: { text: string } }>;
    allowMultiple: boolean;
  };
  document?: {
    title: string;
    description?: string;
    fileUrl: string;
  };
}

export interface LinkedInPost {
  id: string;
  author: string;
  text?: string;
  title?: string;
  description?: string;
  created: string;
  modified?: string;
  visibility?: string;
  media?: any;
  poll?: any;
}

export interface LinkedInUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
      };
    };
    mediaAsset: string;
  };
}

@Injectable()
export class LinkedInAdapter extends BasePostAdapter {
  private readonly apiVersion = '202407';
  private readonly linkedinApiUrl = 'https://api.linkedin.com';
  private readonly personUrn: string;
  private readonly companyUrn: string;

  constructor(account: PlatformAccount, options?: any) {
    super(account, options);
    this.personUrn = `urn:li:person:${account.accountId || account.username || 'UNKNOWN'}`;
    this.companyUrn = (account as any).metadata?.companyUrn || `urn:li:organization:${account.accountId || 'UNKNOWN'}`;
  }

  /**
   * Create the API client for LinkedIn
   */
  protected createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: this.linkedinApiUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'USAMKO/v2',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a LinkedIn post (text, image, video, document, or poll)
   */
  async createPost(content: PostContent): Promise<PostResponse> {
    this.validatePostContent(content);
    this.setAuthorizationHeader();

    try {
      const endpoint = '/v2/ugcPosts';
      const accessToken = this.getAccessToken();

      // Determine if posting as person or organization
      const postAsCompany = (content.metadata as any)?.postAsCompany || false;
      const author = postAsCompany ? this.companyUrn : this.personUrn;

      // Build post payload
      const postData: Record<string, any> = {
        author,
        lifecycleState: 'PUBLISHED',
        visibility: (content.metadata as any)?.visibility || 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      };

      // Handle media attachments (images, videos)
      if (content.mediaUrl || content.image) {
        const mediaUrl = content.mediaUrl || content.image;
        
        if (content.mediaType === 'video' || (content.metadata as any)?.is_video) {
          // Upload video
          const videoUpload = await this.uploadVideo(mediaUrl, content.caption || '');
          if (videoUpload) {
            postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'VIDEO';
            postData.specificContent['com.linkedin.ugc.ShareContent'].media = [videoUpload];
          }
        } else {
          // Upload image
          const imageUpload = await this.uploadImage(mediaUrl, content.caption || '');
          if (imageUpload) {
            postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
            postData.specificContent['com.linkedin.ugc.ShareContent'].media = [imageUpload];
          }
        }
      }

      // Handle document posts
      if ((content.metadata as any)?.document) {
        const docUpload = await this.uploadDocument((content.metadata as any).document);
        if (docUpload) {
          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
          postData.specificContent['com.linkedin.ugc.ShareContent'].media = [docUpload];
        }
      }

      // Handle poll posts
      if ((content.metadata as any)?.poll) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].poll = {
          options: (content.metadata as any).poll.options.map((opt: any) => ({
            label: {
              text: opt.label,
            },
          })),
          allowMultiple: (content.metadata as any).poll.allowMultiple || false,
        };
      }

      // Handle link posts
      if (content.link && !content.mediaUrl) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
          status: 'READY',
          originalUrl: content.link,
          title: content.title || ((content.text || '') as string).substring(0, 100),
          description: content.description || '',
        }];
      }

      // Make the API call
      const response = await this.api.post(endpoint, postData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      return this.mapLinkedInPostToResponse({ ...response.data, id: response.data.id });
    } catch (error: any) {
      this.handleApiError(error, 'Failed to create LinkedIn post');
    }
  }

  /**
   * Upload image to LinkedIn
   */
  async uploadImage(imageUrl: string, caption?: string): Promise<any> {
    try {
      const endpoint = '/v2/assets?action=registerUpload';
      const accessToken = this.getAccessToken();

      const uploadRequest = {
        registerUploadRequest: {
          owner: this.personUrn,
          services: [
            {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: imageUrl,
              },
            },
          ],
          uploadMechanism: [
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest',
          ],
        },
      };

      const response = await this.api.post(endpoint, uploadRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: 'READY',
        originalUrl: imageUrl,
        title: caption || '',
      };
    } catch (error: any) {
      console.error('LinkedIn image upload error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Upload video to LinkedIn
   */
  async uploadVideo(videoUrl: string, caption?: string): Promise<any> {
    try {
      const endpoint = '/v2/assets?action=registerUpload';
      const accessToken = this.getAccessToken();

      const uploadRequest = {
        registerUploadRequest: {
          owner: this.personUrn,
          services: [
            {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: videoUrl,
              },
            },
          ],
          uploadMechanism: [
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest',
          ],
        },
      };

      const response = await this.api.post(endpoint, uploadRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: 'READY',
        originalUrl: videoUrl,
        title: caption || '',
      };
    } catch (error: any) {
      console.error('LinkedIn video upload error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Upload document to LinkedIn
   */
  async uploadDocument(document: { title: string; description?: string; fileUrl: string }): Promise<any> {
    try {
      const endpoint = '/v2/assets?action=registerUpload';
      const accessToken = this.getAccessToken();

      const uploadRequest = {
        registerUploadRequest: {
          owner: this.personUrn,
          services: [
            {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: document.fileUrl,
              },
            },
          ],
          uploadMechanism: [
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest',
          ],
        },
      };

      const response = await this.api.post(endpoint, uploadRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: 'READY',
        originalUrl: document.fileUrl,
        title: document.title,
        description: document.description,
      };
    } catch (error: any) {
      console.error('LinkedIn document upload error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(postId: string): Promise<PostResponse> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get(`/v2/ugcPosts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });

      return this.mapLinkedInPostToResponse(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'Failed to get LinkedIn post');
    }
  }

  /**
   * List posts with optional filtering and pagination
   */
  async listPosts(options?: ListPostsOptions): Promise<PostResponse[]> {
    this.setAuthorizationHeader();

    try {
      const response = await this.api.get('/v2/ugcPosts', {
        params: {
          'q': 'author',
          'author': this.personUrn,
          'count': options?.limit || 10,
        },
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });

      return response.data.elements?.map((post: LinkedInPost) => this.mapLinkedInPostToResponse(post)) || [];
    } catch (error: any) {
      this.handleApiError(error, 'Failed to list LinkedIn posts');
    }
  }

  /**
   * Delete a post by ID
   */
  async deletePost(postId: string): Promise<void> {
    this.setAuthorizationHeader();

    try {
      await this.api.delete(`/v2/ugcPosts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
      });
    } catch (error: any) {
      this.handleApiError(error, 'Failed to delete LinkedIn post');
    }
  }

  /**
   * Refresh access token if expired
   * Uses LinkedIn OAuth2 refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.account.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }

    try {
      const response = await this.api.post(
        '/oauth/v2/accessToken',
        {
          grant_type: 'refresh_token',
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          refresh_token: this.account.refreshToken,
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
        throw new UnauthorizedException('LinkedIn token refresh failed - invalid credentials');
      }
      throw new BadRequestException(`Failed to refresh LinkedIn token: ${error.message}`);
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return {
      limit: 1000, // LinkedIn Marketing API rate limit
      remaining: this.rateLimit.remaining,
      resetAt: this.rateLimit.resetAt,
    };
  }

  /**
   * Map LinkedIn post to PostResponse
   */
  private mapLinkedInPostToResponse(post: LinkedInPost): PostResponse {
    return {
      id: post.id,
      content: post.text || post.description || '',
      mediaUrl: undefined,
      mediaType: post.visibility === 'PUBLIC' ? 'text' : 'link',
      publishedAt: post.created ? new Date(post.created) : undefined,
      status: 'published',
      platformId: this.account.id,
      platformPostId: post.id,
      metadata: {
        visibility: post.visibility,
        author: post.author,
        media: post.media,
        poll: post.poll,
      },
    };
  }

  /**
   * Get the platform name
   */
  protected getAccountPlatform(): string {
    return SocialPlatform.LINKEDIN;
  }
}