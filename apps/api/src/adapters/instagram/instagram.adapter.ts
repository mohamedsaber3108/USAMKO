// Instagram adapter for social media integration

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount } from '../../platforms/platform.model';

export interface InstagramPostOptions {
  caption?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  location_id?: string;
  tags?: string[];
}

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

@Injectable()
export class InstagramAdapter {
  private api: AxiosInstance;
  private graphVersion = 'v18.0';

  constructor() {
    this.api = axios.create({
      baseURL: `https://graph.instagram.com/${this.graphVersion}`,
      timeout: 30000,
    });
  }

  /**
   * Create an Instagram post
   */
  async createPost(
    account: PlatformAccount,
    content: string,
    options: InstagramPostOptions = {}
  ): Promise<InstagramPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/media`,
        {
          caption: content,
          image_url: options.image_url,
          video_url: options.video_url,
          thumbnail_url: options.thumbnail_url,
          location_id: options.location_id,
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
  async getPost(account: PlatformAccount, postId: string): Promise<InstagramPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${postId}`, {
        params: {
          access_token: account.accessToken,
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
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
  ): Promise<{ data: InstagramPost[]; paging?: any }> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${account.username}/media`, {
        params: {
          access_token: account.accessToken,
          limit,
          after,
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
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
   * Get user info
   */
  async getUserInfo(account: PlatformAccount): Promise<any> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${account.username}`, {
        params: {
          access_token: account.accessToken,
          fields:
            'id,username,biography,profile_picture_url,media_count,followers_count,follows_count',
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
      const response = await this.api.get('/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: account.accessToken,
        },
      });

      return response.data.access_token;
    } catch (error: any) {
      throw new BadRequestException('Failed to refresh token');
    }
  }
}
