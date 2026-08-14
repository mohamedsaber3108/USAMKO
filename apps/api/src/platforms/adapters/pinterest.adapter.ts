/**
 * Pinterest Platform Adapter
 *
 * Implements Pinterest API v5 integration for USAMKO.
 * Supports creating pins, boards, and managing Pinterest content.
 *
 * API Documentation: https://developers.pinterest.com/docs/api/v5/
 *
 * Installation:
 * npm install axios
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface PinterestPin {
  board_id: string;
  title?: string;
  description?: string;
  link?: string;
  media_source: {
    source_type: 'image_url' | 'video_url';
    url: string;
  };
}

export interface PinterestBoard {
  name: string;
  description?: string;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

/**
 * Pinterest Adapter
 *
 * Features:
 * - Create pins
 * - Create boards
 * - Update pins
 * - Delete pins
 * - Get pin analytics
 * - Search pins
 * - Get user profile
 *
 * @example
 * const adapter = new PinterestAdapter(platformAccount);
 * await adapter.createPin({
 *   board_id: 'board_123',
 *   title: 'My Pin',
 *   description: 'Pin description',
 *   media_source: {
 *     source_type: 'image_url',
 *     url: 'https://example.com/image.jpg'
 *   }
 * });
 */
@Injectable()
export class PinterestAdapter {
  private readonly logger = new Logger(PinterestAdapter.name);
  private readonly baseUrl = 'https://api.pinterest.com/v5';
  private accessToken: string;
  private userId?: string;

  constructor(private readonly account: PlatformAccount) {
    this.accessToken = account.accessToken || '';

    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.userId = metadata.userId;
    }
  }

  /**
   * Make authenticated API request to Pinterest
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Pinterest API error: ${error.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Pinterest API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create pin
   */
  async createPin(pin: PinterestPin): Promise<any> {
    this.logger.log(`Creating Pinterest pin: ${pin.title}`);

    return await this.makeRequest('POST', '/pins', pin);
  }

  /**
   * Get pin by ID
   */
  async getPin(pinId: string): Promise<any> {
    return await this.makeRequest('GET', `/pins/${pinId}`);
  }

  /**
   * Update pin
   */
  async updatePin(
    pinId: string,
    updates: Partial<PinterestPin>,
  ): Promise<any> {
    this.logger.log(`Updating Pinterest pin: ${pinId}`);

    return await this.makeRequest('PATCH', `/pins/${pinId}`, updates);
  }

  /**
   * Delete pin
   */
  async deletePin(pinId: string): Promise<void> {
    this.logger.log(`Deleting Pinterest pin: ${pinId}`);

    await this.makeRequest('DELETE', `/pins/${pinId}`);
  }

  /**
   * Create board
   */
  async createBoard(board: PinterestBoard): Promise<any> {
    this.logger.log(`Creating Pinterest board: ${board.name}`);

    return await this.makeRequest('POST', '/boards', board);
  }

  /**
   * Get board by ID
   */
  async getBoard(boardId: string): Promise<any> {
    return await this.makeRequest('GET', `/boards/${boardId}`);
  }

  /**
   * List boards
   */
  async listBoards(): Promise<any> {
    return await this.makeRequest('GET', '/boards');
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    return await this.makeRequest('GET', '/user_account');
  }

  /**
   * Get pin analytics
   */
  async getPinAnalytics(pinId: string): Promise<any> {
    return await this.makeRequest('GET', `/pins/${pinId}/analytics`);
  }

  /**
   * Search pins
   */
  async searchPins(query: string): Promise<any> {
    return await this.makeRequest('GET', `/search/pins?query=${encodeURIComponent(query)}`);
  }

  /**
   * Get board pins
   */
  async getBoardPins(boardId: string): Promise<any> {
    return await this.makeRequest('GET', `/boards/${boardId}/pins`);
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   */
  async createPost(data: { text?: string; mediaUrl?: string; boardId?: string }): Promise<any> {
    if (!data.mediaUrl) {
      throw new Error('Pinterest requires media URL for pins');
    }

    if (!data.boardId) {
      // Get first board
      const boards = await this.listBoards();
      if (!boards.items || boards.items.length === 0) {
        throw new Error('No boards found. Create a board first.');
      }
      data.boardId = boards.items[0].id;
    }

    const isVideo = /\.(mp4|mov|avi)$/i.test(data.mediaUrl);

    return await this.createPin({
      board_id: data.boardId,
      title: data.text?.substring(0, 100) || 'Untitled Pin',
      description: data.text || '',
      media_source: {
        source_type: isVideo ? 'video_url' : 'image_url',
        url: data.mediaUrl,
      },
    });
  }

  /**
   * Get post (pin) by ID
   */
  async getPost(pinId: string): Promise<any> {
    return await this.getPin(pinId);
  }

  /**
   * Delete post (pin)
   */
  async deletePost(pinId: string): Promise<void> {
    await this.deletePin(pinId);
  }

  /**
   * List posts (pins)
   */
  async listPosts(options?: { boardId?: string; limit?: number }): Promise<any[]> {
    if (options?.boardId) {
      const result = await this.getBoardPins(options.boardId);
      return result.items || [];
    } else {
      // Get pins from all boards
      const boards = await this.listBoards();
      if (!boards.items || boards.items.length === 0) {
        return [];
      }

      const allPins = [];
      for (const board of boards.items) {
        const pins = await this.getBoardPins(board.id);
        allPins.push(...(pins.items || []));
        if (options?.limit && allPins.length >= options.limit) {
          break;
        }
      }

      return allPins.slice(0, options?.limit || allPins.length);
    }
  }

  /**
   * Repin (save someone else's pin to your board)
   */
  async repin(pinId: string, boardId: string): Promise<any> {
    const pin = await this.getPin(pinId);

    return await this.createPin({
      board_id: boardId,
      title: pin.title,
      description: pin.description,
      link: pin.link,
      media_source: pin.media_source,
    });
  }

  /**
   * Follow user
   */
  async followUser(userId: string): Promise<any> {
    return await this.makeRequest('POST', `/user_account/following/${userId}`);
  }

  /**
   * Unfollow user
   */
  async unfollowUser(userId: string): Promise<void> {
    await this.makeRequest('DELETE', `/user_account/following/${userId}`);
  }
}
