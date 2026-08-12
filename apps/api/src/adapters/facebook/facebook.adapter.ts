// Facebook adapter for social media integration

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount, SocialPlatform, AccountStatus } from '../../platforms/platform.model';

export interface FacebookPostOptions {
  message?: string;
  link?: string;
  picture?: string;
  name?: string;
  description?: string;
  place?: string;
  tags?: string[];
}

export interface FacebookPost {
  id: string;
  message?: string;
  link?: string;
  picture?: string;
  created_time: string;
  from: { id: string; name: string };
}

@Injectable()
export class FacebookAdapter {
  private api: AxiosInstance;
  private graphVersion = 'v18.0';

  constructor() {
    this.api = axios.create({
      baseURL: `https://graph.facebook.com/${this.graphVersion}`,
      timeout: 30000,
    });
  }

  /**
   * Create a Facebook post
   */
  async createPost(
    account: PlatformAccount,
    content: string,
    options: FacebookPostOptions = {}
  ): Promise<FacebookPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/feed`,
        {
          message: content,
          link: options.link,
          picture: options.picture,
          name: options.name,
          description: options.description,
          place: options.place,
          tags: options.tags?.join(','),
          access_token: account.accessToken,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
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
  async getPost(account: PlatformAccount, postId: string): Promise<FacebookPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${postId}`, {
        params: {
          access_token: account.accessToken,
          fields: 'id,message,link,picture,created_time,from',
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
   * List posts
   */
  async listPosts(
    account: PlatformAccount,
    limit: number = 10,
    after?: string
  ): Promise<{ data: FacebookPost[]; paging?: any }> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${account.username}/feed`, {
        params: {
          access_token: account.accessToken,
          limit,
          after,
          fields: 'id,message,link,picture,created_time,from',
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
      await this.api.delete(`/${postId}`, {
        params: {
          access_token: account.accessToken,
        },
      });

      return true;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Get page info
   */
  async getPageInfo(account: PlatformAccount): Promise<any> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${account.username}`, {
        params: {
          access_token: account.accessToken,
          fields: 'id,name,about,website,cover,fan_count,likes,talking_about_count',
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
      const response = await this.api.get('/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: 'fb_exchange_token',
          fb_exchange_token: account.accessToken,
        },
      });

      return response.data.access_token;
    } catch (error: any) {
      throw new BadRequestException('Failed to refresh token');
    }
  }
}
