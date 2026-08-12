// LinkedIn adapter for social media integration

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount } from '../../platforms/platform.model';

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
}

export interface LinkedInPost {
  id: string;
  author: string;
  text?: string;
  title?: string;
  description?: string;
  created: string;
  modified?: string;
}

@Injectable()
export class LinkedInAdapter {
  private api: AxiosInstance;
  private apiVersion = '202407';

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.linkedin.com/v2',
      timeout: 30000,
      headers: {
        'LinkedIn-Version': this.apiVersion,
      },
    });
  }

  /**
   * Create a LinkedIn post
   */
  async createPost(
    account: PlatformAccount,
    content: string,
    options: LinkedInPostOptions = {}
  ): Promise<LinkedInPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      // Set authorization header
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      // Create article
      const articleResponse = await this.api.post('/articles', {
        author: `urn:li:person:${account.username}`,
        title: options.title,
        description: options.description,
        subject: options.subject,
        category: options.category,
        visibility: options.visibility || 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabled: false,
      });

      return articleResponse.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new BadRequestException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Get a post by ID
   */
  async getPost(account: PlatformAccount, postId: string): Promise<LinkedInPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get(`/articles/${postId}`);

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * List posts
   */
  async listPosts(
    account: PlatformAccount,
    limit: number = 10
  ): Promise<{ elements: LinkedInPost[]; paging?: any }> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get('/articles', {
        params: {
          q: 'author',
          author: `urn:li:person:${account.username}`,
          count: limit,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(account: PlatformAccount, postId: string): Promise<boolean> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      await this.api.delete(`/articles/${postId}`);

      return true;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Get profile info
   */
  async getProfileInfo(account: PlatformAccount): Promise<any> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get('/me', {
        params: {
          projection: '(id,firstName,lastName,profilePicture,headline,summary)',
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(account: PlatformAccount): Promise<string> {
    if (!account.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.post(
        '/oauth/v2/accessToken',
        {
          grant_type: 'refresh_token',
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          refresh_token: account.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error: any) {
      throw new BadRequestException('Failed to refresh token');
    }
  }
}
