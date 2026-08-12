// Twitter adapter for social media integration

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount } from '../../platforms/platform.model';

export interface TwitterPostOptions {
  media_ids?: string[];
  reply_to?: string;
  quote_tweet_id?: string;
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
}

@Injectable()
export class TwitterAdapter {
  private api: AxiosInstance;
  private apiVersion = '2';

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.twitter.com',
      timeout: 30000,
      headers: {
        'User-Agent': 'USAMKO/v2',
      },
    });
  }

  /**
   * Create a Twitter tweet
   */
  async createPost(
    account: PlatformAccount,
    content: string,
    options: TwitterPostOptions = {}
  ): Promise<TwitterPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      // Set authorization header
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.post('/2/tweets', {
        text: content,
        media: {
          media_ids: options.media_ids,
        },
        reply: options.reply_to ? { in_reply_to_tweet_id: options.reply_to } : undefined,
        quote_tweet_id: options.quote_tweet_id,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new BadRequestException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * Get a tweet by ID
   */
  async getTweet(account: PlatformAccount, tweetId: string): Promise<TwitterPost> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get(`/2/tweets/${tweetId}`, {
        params: {
          'tweet.fields': 'created_at,author_id,public_metrics',
          expansions: 'author_id',
        },
      });

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new NotFoundException(error.response.data.error.message);
      }
      throw error;
    }
  }

  /**
   * List user tweets
   */
  async listTweets(
    account: PlatformAccount,
    limit: number = 10,
    paginationToken?: string
  ): Promise<{ data: TwitterPost[]; meta?: any; links?: any }> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get(`/2/users/${account.username}/tweets`, {
        params: {
          max_results: limit,
          'tweet.fields': 'created_at,author_id,public_metrics',
          pagination_token: paginationToken,
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
   * Delete a tweet
   */
  async deleteTweet(account: PlatformAccount, tweetId: string): Promise<boolean> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      await this.api.delete(`/2/tweets/${tweetId}`);

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
      this.api.defaults.headers.common['Authorization'] = `Bearer ${account.accessToken}`;

      const response = await this.api.get(`/2/users/by/username/${account.username}`, {
        params: {
          'user.fields': 'id,name,username,description,public_metrics,created_at,verified',
        },
      });

      return response.data.data;
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
        '/oauth2/token',
        {
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          client_id: process.env.TWITTER_CLIENT_ID,
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
