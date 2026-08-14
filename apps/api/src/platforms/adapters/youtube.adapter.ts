/**
 * YouTube Platform Adapter
 *
 * Implements YouTube Data API v3 integration for USAMKO.
 * Supports video uploads, comments, playlists, and channel management.
 *
 * API Documentation: https://developers.google.com/youtube/v3
 *
 * Installation:
 * npm install googleapis @types/google.auth
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface YouTubeVideo {
  id?: string;
  snippet?: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    defaultLanguage?: string;
  };
  status?: {
    privacyStatus: 'public' | 'private' | 'unlisted';
    publishAt?: string;
    selfDeclaredMadeForKids?: boolean;
  };
}

export interface YouTubeComment {
  textOriginal: string;
  videoId: string;
}

/**
 * YouTube Adapter
 *
 * Features:
 * - Upload videos
 * - Update video metadata
 * - List videos
 * - Delete videos
 * - Post comments
 * - Manage playlists
 * - Get channel statistics
 *
 * @example
 * const adapter = new YouTubeAdapter(platformAccount);
 * await adapter.uploadVideo({
 *   snippet: {
 *     title: 'My Video',
 *     description: 'Video description'
 *   },
 *   status: {
 *     privacyStatus: 'public'
 *   }
 * }, videoFileBuffer);
 */
@Injectable()
export class YouTubeAdapter {
  private readonly logger = new Logger(YouTubeAdapter.name);
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly uploadUrl = 'https://www.googleapis.com/upload/youtube/v3';
  private accessToken: string;
  private channelId?: string;

  constructor(private readonly account: PlatformAccount) {
    this.accessToken = account.accessToken || '';

    // Parse channel ID from metadata
    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.channelId = metadata.channelId;
    }
  }

  /**
   * Make authenticated API request to YouTube
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, string>,
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);

    // Add query parameters
    if (params) {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key])
      );
    }

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `YouTube API error: ${error.error?.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`YouTube API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload video
   * Note: This is a simplified version. Full video upload requires multipart upload.
   */
  async uploadVideo(video: YouTubeVideo, videoFile?: Buffer): Promise<any> {
    this.logger.log('Uploading video to YouTube');

    // For now, this is a metadata-only update
    // Full video upload requires resumable upload protocol

    return await this.makeRequest('POST', 'videos', video, {
      part: 'snippet,status',
    });
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, video: YouTubeVideo): Promise<any> {
    this.logger.log(`Updating YouTube video: ${videoId}`);

    return await this.makeRequest('PUT', 'videos', video, {
      part: 'snippet,status',
    });
  }

  /**
   * Get video by ID
   */
  async getVideo(videoId: string): Promise<any> {
    return await this.makeRequest('GET', 'videos', undefined, {
      part: 'snippet,contentDetails,status,statistics',
      id: videoId,
    });
  }

  /**
   * List videos from channel
   */
  async listVideos(maxResults: number = 10): Promise<any> {
    if (!this.channelId) {
      // Get channel ID first
      const channelInfo = await this.getChannelInfo();
      this.channelId = channelInfo.items[0].id;
    }

    return await this.makeRequest('GET', 'search', undefined, {
      part: 'snippet',
      channelId: this.channelId!,
      type: 'video',
      order: 'date',
      maxResults: maxResults.toString(),
    });
  }

  /**
   * Delete video
   */
  async deleteVideo(videoId: string): Promise<void> {
    this.logger.log(`Deleting YouTube video: ${videoId}`);

    await this.makeRequest('DELETE', 'videos', undefined, {
      id: videoId,
    });
  }

  /**
   * Post comment on video
   */
  async postComment(comment: YouTubeComment): Promise<any> {
    this.logger.log(`Posting comment on video: ${comment.videoId}`);

    return await this.makeRequest(
      'POST',
      'commentThreads',
      {
        snippet: {
          videoId: comment.videoId,
          topLevelComment: {
            snippet: {
              textOriginal: comment.textOriginal,
            },
          },
        },
      },
      {
        part: 'snippet',
      }
    );
  }

  /**
   * Get channel information
   */
  async getChannelInfo(): Promise<any> {
    return await this.makeRequest('GET', 'channels', undefined, {
      part: 'snippet,contentDetails,statistics',
      mine: 'true',
    });
  }

  /**
   * Get channel statistics
   */
  async getChannelStatistics(): Promise<any> {
    const info = await this.getChannelInfo();
    return info.items[0]?.statistics || {};
  }

  /**
   * Create playlist
   */
  async createPlaylist(title: string, description?: string): Promise<any> {
    this.logger.log(`Creating YouTube playlist: ${title}`);

    return await this.makeRequest(
      'POST',
      'playlists',
      {
        snippet: {
          title,
          description: description || '',
        },
        status: {
          privacyStatus: 'public',
        },
      },
      {
        part: 'snippet,status',
      }
    );
  }

  /**
   * Add video to playlist
   */
  async addVideoToPlaylist(playlistId: string, videoId: string): Promise<any> {
    this.logger.log(`Adding video ${videoId} to playlist ${playlistId}`);

    return await this.makeRequest(
      'POST',
      'playlistItems',
      {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
      {
        part: 'snippet',
      }
    );
  }

  /**
   * Search videos
   */
  async searchVideos(query: string, maxResults: number = 10): Promise<any> {
    return await this.makeRequest('GET', 'search', undefined, {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
    });
  }

  /**
   * Get video comments
   */
  async getVideoComments(videoId: string, maxResults: number = 20): Promise<any> {
    return await this.makeRequest('GET', 'commentThreads', undefined, {
      part: 'snippet',
      videoId,
      maxResults: maxResults.toString(),
      order: 'time',
    });
  }

  /**
   * Like video
   */
  async likeVideo(videoId: string): Promise<void> {
    await this.makeRequest('POST', 'videos/rate', undefined, {
      id: videoId,
      rating: 'like',
    });
  }

  /**
   * Subscribe to channel
   */
  async subscribeToChannel(channelId: string): Promise<any> {
    return await this.makeRequest(
      'POST',
      'subscriptions',
      {
        snippet: {
          resourceId: {
            kind: 'youtube#channel',
            channelId,
          },
        },
      },
      {
        part: 'snippet',
      }
    );
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   * Note: YouTube Community posts require different API
   */
  async createPost(data: { text?: string; mediaUrl?: string }): Promise<any> {
    if (data.mediaUrl) {
      // Upload as video
      return await this.uploadVideo({
        snippet: {
          title: data.text || 'Untitled Video',
          description: data.text || '',
        },
        status: {
          privacyStatus: 'public',
        },
      });
    } else {
      // YouTube doesn't support text-only posts via API
      // Community posts require YouTube Studio API (not publicly available)
      throw new Error('Text-only posts not supported via YouTube API');
    }
  }

  /**
   * Get post (video) by ID
   */
  async getPost(videoId: string): Promise<any> {
    return await this.getVideo(videoId);
  }

  /**
   * Delete post (video)
   */
  async deletePost(videoId: string): Promise<void> {
    await this.deleteVideo(videoId);
  }

  /**
   * List posts (videos)
   */
  async listPosts(options?: { limit?: number }): Promise<any[]> {
    const result = await this.listVideos(options?.limit || 10);
    return result.items || [];
  }
}
