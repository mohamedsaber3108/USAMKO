/**
 * VK (VKontakte) Platform Adapter
 *
 * Implements VK API integration for USAMKO.
 * Supports posting, messaging, and managing VK content.
 *
 * API Documentation: https://dev.vk.com/reference
 *
 * Installation:
 * npm install vk-io
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface VKPost {
  owner_id?: number; // User or group ID
  message?: string;
  attachments?: string[]; // photo123_456,video234_567
  from_group?: 0 | 1; // Post on behalf of group
  lat?: number;
  long?: number;
}

export interface VKWallPost {
  text?: string;
  attachments?: string;
  owner_id?: number;
}

/**
 * VK Adapter
 *
 * Features:
 * - Post to wall
 * - Upload photos
 * - Upload videos
 * - Get wall posts
 * - Delete posts
 * - Get user profile
 * - Search posts
 * - Send messages
 * - Get group info
 *
 * @example
 * const adapter = new VKAdapter(platformAccount);
 * await adapter.postToWall({
 *   message: 'Hello VK!',
 *   owner_id: -12345678 // Negative for groups
 * });
 */
@Injectable()
export class VKAdapter {
  private readonly logger = new Logger(VKAdapter.name);
  private readonly baseUrl = 'https://api.vk.com/method';
  private readonly apiVersion = '5.131';
  private accessToken: string;
  private userId?: number;

  constructor(private readonly account: PlatformAccount) {
    this.accessToken = account.accessToken || '';

    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.userId = metadata.userId ? parseInt(metadata.userId, 10) : undefined;
    }
  }

  /**
   * Make authenticated API request to VK
   */
  private async makeRequest(method: string, params: Record<string, any> = {}): Promise<any> {
    const url = `${this.baseUrl}/${method}`;

    const formData = new URLSearchParams({
      ...params,
      access_token: this.accessToken,
      v: this.apiVersion,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(
          `VK API error: ${result.error.error_msg} (code: ${result.error.error_code})`
        );
      }

      return result.response;
    } catch (error) {
      this.logger.error(`VK API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Post to wall
   */
  async postToWall(post: VKPost): Promise<any> {
    this.logger.log('Posting to VK wall');

    const params: any = {};

    if (post.owner_id) params.owner_id = post.owner_id;
    if (post.message) params.message = post.message;
    if (post.attachments && post.attachments.length > 0) {
      params.attachments = post.attachments.join(',');
    }
    if (post.from_group !== undefined) params.from_group = post.from_group;
    if (post.lat) params.lat = post.lat;
    if (post.long) params.long = post.long;

    return await this.makeRequest('wall.post', params);
  }

  /**
   * Get wall posts
   */
  async getWallPosts(ownerId?: number, count: number = 10): Promise<any> {
    const params: any = {
      count: count,
    };

    if (ownerId) {
      params.owner_id = ownerId;
    }

    return await this.makeRequest('wall.get', params);
  }

  /**
   * Get post by ID (format: "ownerId_postId")
   */
  async getPost(postId: string): Promise<any> {
    const posts = postId; // VK expects format "ownerId_postId"

    return await this.makeRequest('wall.getById', {
      posts: posts,
    });
  }

  /**
   * Delete post (format: "ownerId_postId")
   */
  async deletePost(postId: string): Promise<void> {
    const [ownerId, pId] = postId.split('_');
    this.logger.log(`Deleting VK post: ${postId}`);

    await this.makeRequest('wall.delete', {
      owner_id: parseInt(ownerId, 10),
      post_id: parseInt(pId, 10),
    });
  }

  /**
   * Edit post
   */
  async editPost(
    ownerId: number,
    postId: number,
    message: string,
    attachments?: string[],
  ): Promise<any> {
    this.logger.log(`Editing VK post: ${ownerId}_${postId}`);

    const params: any = {
      owner_id: ownerId,
      post_id: postId,
      message: message,
    };

    if (attachments && attachments.length > 0) {
      params.attachments = attachments.join(',');
    }

    return await this.makeRequest('wall.edit', params);
  }

  /**
   * Upload photo to wall
   */
  async uploadPhoto(photoUrl: string, ownerId?: number): Promise<string> {
    // Step 1: Get upload server
    const uploadServer = await this.makeRequest('photos.getWallUploadServer', {
      group_id: ownerId && ownerId < 0 ? Math.abs(ownerId) : undefined,
    });

    // Step 2: Upload photo to server
    const uploadResponse = await fetch(uploadServer.upload_url, {
      method: 'POST',
      body: JSON.stringify({ photo: photoUrl }),
    });

    const uploadResult = await uploadResponse.json();

    // Step 3: Save photo
    const savedPhoto = await this.makeRequest('photos.saveWallPhoto', {
      group_id: ownerId && ownerId < 0 ? Math.abs(ownerId) : undefined,
      photo: uploadResult.photo,
      server: uploadResult.server,
      hash: uploadResult.hash,
    });

    // Return attachment string
    return `photo${savedPhoto[0].owner_id}_${savedPhoto[0].id}`;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId?: number): Promise<any> {
    const params: any = {
      fields: 'photo_max,screen_name,followers_count',
    };

    if (userId) {
      params.user_ids = userId;
    }

    return await this.makeRequest('users.get', params);
  }

  /**
   * Get group info
   */
  async getGroup(groupId: number): Promise<any> {
    return await this.makeRequest('groups.getById', {
      group_id: Math.abs(groupId),
      fields: 'description,members_count,activity',
    });
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, count: number = 10): Promise<any> {
    return await this.makeRequest('wall.search', {
      query: query,
      count: count,
    });
  }

  /**
   * Like post
   */
  async likePost(ownerId: number, itemId: number): Promise<any> {
    return await this.makeRequest('likes.add', {
      type: 'post',
      owner_id: ownerId,
      item_id: itemId,
    });
  }

  /**
   * Unlike post
   */
  async unlikePost(ownerId: number, itemId: number): Promise<any> {
    return await this.makeRequest('likes.delete', {
      type: 'post',
      owner_id: ownerId,
      item_id: itemId,
    });
  }

  /**
   * Comment on post
   */
  async commentOnPost(
    ownerId: number,
    postId: number,
    message: string,
  ): Promise<any> {
    return await this.makeRequest('wall.createComment', {
      owner_id: ownerId,
      post_id: postId,
      message: message,
    });
  }

  /**
   * Get post comments
   */
  async getPostComments(ownerId: number, postId: number): Promise<any> {
    return await this.makeRequest('wall.getComments', {
      owner_id: ownerId,
      post_id: postId,
    });
  }

  /**
   * Repost
   */
  async repost(object: string, message?: string): Promise<any> {
    // object format: wall{owner_id}_{post_id}
    const params: any = {
      object: object,
    };

    if (message) {
      params.message = message;
    }

    return await this.makeRequest('wall.repost', params);
  }

  /**
   * Send message
   */
  async sendMessage(userId: number, message: string): Promise<any> {
    return await this.makeRequest('messages.send', {
      user_id: userId,
      message: message,
      random_id: Date.now(),
    });
  }

  /**
   * Get news feed
   */
  async getNewsFeed(count: number = 10): Promise<any> {
    return await this.makeRequest('newsfeed.get', {
      count: count,
    });
  }

  /**
   * Subscribe to user/group
   */
  async subscribe(targetId: number): Promise<any> {
    if (targetId > 0) {
      // User
      return await this.makeRequest('friends.add', {
        user_id: targetId,
      });
    } else {
      // Group
      return await this.makeRequest('groups.join', {
        group_id: Math.abs(targetId),
      });
    }
  }

  /**
   * Unsubscribe from user/group
   */
  async unsubscribe(targetId: number): Promise<any> {
    if (targetId > 0) {
      // User
      return await this.makeRequest('friends.delete', {
        user_id: targetId,
      });
    } else {
      // Group
      return await this.makeRequest('groups.leave', {
        group_id: Math.abs(targetId),
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(groupId: number): Promise<any> {
    return await this.makeRequest('stats.get', {
      group_id: Math.abs(groupId),
    });
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   */
  async createPost(data: {
    text?: string;
    mediaUrl?: string;
    ownerId?: number;
  }): Promise<any> {
    const post: VKPost = {
      message: data.text,
      owner_id: data.ownerId || this.userId,
    };

    if (data.mediaUrl) {
      // Upload photo and add as attachment
      const attachment = await this.uploadPhoto(data.mediaUrl, post.owner_id);
      post.attachments = [attachment];
    }

    return await this.postToWall(post);
  }

  /**
   * Get post by ID (for USAMKO platform adapter interface)
   */
  async getPostById(postId: string): Promise<any> {
    return await this.getPost(postId);
  }

  /**
   * Delete post (for USAMKO platform adapter interface)
   */
  async deletePostById(postId: string): Promise<void> {
    await this.deletePost(postId);
  }

  /**
   * List posts (for USAMKO platform adapter interface)
   */
  async listPosts(options?: { ownerId?: number; limit?: number }): Promise<any[]> {
    const result = await this.getWallPosts(
      options?.ownerId || this.userId,
      options?.limit || 10,
    );

    return result.items || [];
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken?(): Promise<string> {
    throw new Error('Token refresh not implemented for VK adapter');
  }
}
