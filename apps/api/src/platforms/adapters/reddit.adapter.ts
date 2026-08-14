/**
 * Reddit Platform Adapter
 *
 * Implements Reddit API integration for USAMKO.
 * Supports posting, commenting, voting, and managing subreddits.
 *
 * API Documentation: https://www.reddit.com/dev/api
 *
 * Installation:
 * npm install snoowrap @types/snoowrap
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface RedditPost {
  subreddit: string;
  title: string;
  text?: string;
  url?: string;
  kind: 'self' | 'link' | 'image' | 'video';
}

export interface RedditComment {
  text: string;
  parent_id: string; // Post or comment ID
}

/**
 * Reddit Adapter
 *
 * Features:
 * - Submit posts (text, link, image, video)
 * - Comment on posts
 * - Vote on posts/comments
 * - Get post details
 * - Search posts
 * - Get user profile
 * - Get subreddit info
 * - Cross-post
 *
 * @example
 * const adapter = new RedditAdapter(platformAccount);
 * await adapter.submitPost({
 *   subreddit: 'test',
 *   title: 'My Post',
 *   text: 'Post content',
 *   kind: 'self'
 * });
 */
@Injectable()
export class RedditAdapter {
  private readonly logger = new Logger(RedditAdapter.name);
  private readonly baseUrl = 'https://oauth.reddit.com';
  private accessToken: string;
  private username?: string;

  constructor(private readonly account: PlatformAccount) {
    this.accessToken = account.accessToken || '';

    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.username = metadata.username || account.username;
    }
  }

  /**
   * Make authenticated API request to Reddit
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'User-Agent': 'USAMKO/1.0.0',
      },
    };

    if (data && method === 'POST') {
      const formData = new URLSearchParams();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      options.body = formData;
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Reddit API error: ${error.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Reddit API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit post
   */
  async submitPost(post: RedditPost): Promise<any> {
    this.logger.log(`Submitting post to r/${post.subreddit}: ${post.title}`);

    const data: any = {
      sr: post.subreddit,
      title: post.title,
      kind: post.kind,
    };

    if (post.kind === 'self') {
      data.text = post.text;
    } else if (post.kind === 'link') {
      data.url = post.url;
    } else if (post.kind === 'image' || post.kind === 'video') {
      data.url = post.url;
      data.kind = 'link'; // Reddit API uses 'link' for media
    }

    return await this.makeRequest('POST', '/api/submit', data);
  }

  /**
   * Comment on post
   */
  async commentOnPost(comment: RedditComment): Promise<any> {
    this.logger.log(`Commenting on ${comment.parent_id}`);

    return await this.makeRequest('POST', '/api/comment', {
      parent: comment.parent_id,
      text: comment.text,
    });
  }

  /**
   * Get post details
   */
  async getPost(postId: string): Promise<any> {
    // Reddit post IDs are in format t3_xxxxx
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('GET', `/api/info?id=${fullId}`);
  }

  /**
   * Delete post
   */
  async deletePost(postId: string): Promise<void> {
    this.logger.log(`Deleting post: ${postId}`);

    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    await this.makeRequest('POST', '/api/del', {
      id: fullId,
    });
  }

  /**
   * Upvote post/comment
   */
  async upvote(thingId: string): Promise<any> {
    return await this.makeRequest('POST', '/api/vote', {
      id: thingId,
      dir: 1, // 1 = upvote, 0 = unvote, -1 = downvote
    });
  }

  /**
   * Downvote post/comment
   */
  async downvote(thingId: string): Promise<any> {
    return await this.makeRequest('POST', '/api/vote', {
      id: thingId,
      dir: -1,
    });
  }

  /**
   * Remove vote
   */
  async unvote(thingId: string): Promise<any> {
    return await this.makeRequest('POST', '/api/vote', {
      id: thingId,
      dir: 0,
    });
  }

  /**
   * Get user profile
   */
  async getUserProfile(username?: string): Promise<any> {
    const user = username || this.username || 'me';
    return await this.makeRequest('GET', `/user/${user}/about`);
  }

  /**
   * Get user posts
   */
  async getUserPosts(username?: string, limit: number = 10): Promise<any> {
    const user = username || this.username || 'me';
    return await this.makeRequest('GET', `/user/${user}/submitted?limit=${limit}`);
  }

  /**
   * Get subreddit info
   */
  async getSubreddit(subreddit: string): Promise<any> {
    return await this.makeRequest('GET', `/r/${subreddit}/about`);
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, subreddit?: string): Promise<any> {
    const searchEndpoint = subreddit
      ? `/r/${subreddit}/search`
      : '/search';

    return await this.makeRequest(
      'GET',
      `${searchEndpoint}?q=${encodeURIComponent(query)}&restrict_sr=${!!subreddit}`
    );
  }

  /**
   * Get hot posts from subreddit
   */
  async getHotPosts(subreddit: string, limit: number = 25): Promise<any> {
    return await this.makeRequest('GET', `/r/${subreddit}/hot?limit=${limit}`);
  }

  /**
   * Get new posts from subreddit
   */
  async getNewPosts(subreddit: string, limit: number = 25): Promise<any> {
    return await this.makeRequest('GET', `/r/${subreddit}/new?limit=${limit}`);
  }

  /**
   * Get top posts from subreddit
   */
  async getTopPosts(
    subreddit: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day',
    limit: number = 25,
  ): Promise<any> {
    return await this.makeRequest(
      'GET',
      `/r/${subreddit}/top?t=${timeframe}&limit=${limit}`
    );
  }

  /**
   * Subscribe to subreddit
   */
  async subscribe(subreddit: string): Promise<any> {
    return await this.makeRequest('POST', '/api/subscribe', {
      action: 'sub',
      sr_name: subreddit,
    });
  }

  /**
   * Unsubscribe from subreddit
   */
  async unsubscribe(subreddit: string): Promise<any> {
    return await this.makeRequest('POST', '/api/subscribe', {
      action: 'unsub',
      sr_name: subreddit,
    });
  }

  /**
   * Save post
   */
  async savePost(postId: string): Promise<any> {
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('POST', '/api/save', {
      id: fullId,
    });
  }

  /**
   * Unsave post
   */
  async unsavePost(postId: string): Promise<any> {
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('POST', '/api/unsave', {
      id: fullId,
    });
  }

  /**
   * Hide post
   */
  async hidePost(postId: string): Promise<any> {
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('POST', '/api/hide', {
      id: fullId,
    });
  }

  /**
   * Report post
   */
  async reportPost(postId: string, reason: string): Promise<any> {
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('POST', '/api/report', {
      thing_id: fullId,
      reason: reason,
    });
  }

  /**
   * Cross-post
   */
  async crossPost(
    originalPostId: string,
    targetSubreddit: string,
    title: string,
  ): Promise<any> {
    this.logger.log(`Cross-posting ${originalPostId} to r/${targetSubreddit}`);

    return await this.makeRequest('POST', '/api/submit', {
      kind: 'crosspost',
      crosspost_fullname: originalPostId,
      sr: targetSubreddit,
      title: title,
    });
  }

  /**
   * Edit post
   */
  async editPost(postId: string, newText: string): Promise<any> {
    const fullId = postId.startsWith('t3_') ? postId : `t3_${postId}`;

    return await this.makeRequest('POST', '/api/editusertext', {
      thing_id: fullId,
      text: newText,
    });
  }

  /**
   * Get post comments
   */
  async getPostComments(postId: string): Promise<any> {
    const id = postId.replace('t3_', '');

    // Get post info to find subreddit
    const postInfo = await this.getPost(postId);
    const subreddit = postInfo.data.children[0].data.subreddit;

    return await this.makeRequest('GET', `/r/${subreddit}/comments/${id}`);
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   */
  async createPost(data: {
    text?: string;
    mediaUrl?: string;
    subreddit?: string;
    title?: string;
  }): Promise<any> {
    if (!data.subreddit) {
      throw new Error('Subreddit is required for Reddit posts');
    }

    if (!data.title) {
      throw new Error('Title is required for Reddit posts');
    }

    let kind: 'self' | 'link' | 'image' | 'video' = 'self';
    let url: string | undefined;

    if (data.mediaUrl) {
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(data.mediaUrl);
      const isVideo = /\.(mp4|mov|avi)$/i.test(data.mediaUrl);

      if (isImage) {
        kind = 'image';
      } else if (isVideo) {
        kind = 'video';
      } else {
        kind = 'link';
      }

      url = data.mediaUrl;
    }

    return await this.submitPost({
      subreddit: data.subreddit,
      title: data.title,
      text: data.text,
      url: url,
      kind: kind,
    });
  }

  /**
   * List posts (user's submitted posts)
   */
  async listPosts(options?: { limit?: number }): Promise<any[]> {
    const result = await this.getUserPosts(this.username, options?.limit || 10);
    return result.data?.children || [];
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken?(): Promise<string> {
    throw new Error('Token refresh not implemented for Reddit adapter');
  }
}
