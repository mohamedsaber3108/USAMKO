/**
 * ASK.fm Platform Adapter
 *
 * Implements ASK.fm integration for USAMKO.
 * Supports answering questions, posting content, and managing profile.
 *
 * Note: ASK.fm does not have an official public API.
 * This adapter uses web scraping and unofficial methods.
 *
 * Installation:
 * npm install axios cheerio
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface AskFmQuestion {
  id: string;
  question: string;
  author?: string;
  timestamp?: Date;
}

export interface AskFmAnswer {
  questionId: string;
  answer: string;
  photo?: string;
}

/**
 * ASK.fm Adapter
 *
 * Features:
 * - Answer questions
 * - Post shoutouts
 * - Get questions
 * - Get profile
 * - Search users
 *
 * Note: This adapter uses unofficial methods since ASK.fm
 * doesn't have a public API. Functionality may break if ASK.fm
 * changes their website structure.
 *
 * @example
 * const adapter = new AskFmAdapter(platformAccount);
 * await adapter.answerQuestion({
 *   questionId: 'q123',
 *   answer: 'My answer text'
 * });
 */
@Injectable()
export class AskFmAdapter {
  private readonly logger = new Logger(AskFmAdapter.name);
  private readonly baseUrl = 'https://ask.fm';
  private accessToken: string;
  private username?: string;
  private cookies?: string;

  constructor(private readonly account: PlatformAccount) {
    this.accessToken = account.accessToken || '';
    this.username = account.username;

    // Parse cookies from metadata
    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.cookies = metadata.cookies;
    }
  }

  /**
   * Make authenticated request to ASK.fm
   */
  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json, text/html',
    };

    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method === 'POST') {
      const formData = new URLSearchParams();
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key]);
      });
      options.body = formData;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`ASK.fm request failed: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      this.logger.error(`ASK.fm request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Answer question
   */
  async answerQuestion(answer: AskFmAnswer): Promise<any> {
    this.logger.log(`Answering question: ${answer.questionId}`);

    const data: any = {
      qid: answer.questionId,
      answer: answer.answer,
    };

    if (answer.photo) {
      data.photo = answer.photo;
    }

    return await this.makeRequest('POST', '/answers', data);
  }

  /**
   * Post shoutout (public post)
   */
  async postShoutout(text: string, photo?: string): Promise<any> {
    this.logger.log('Posting shoutout to ASK.fm');

    const data: any = {
      text: text,
    };

    if (photo) {
      data.photo = photo;
    }

    return await this.makeRequest('POST', '/shoutouts', data);
  }

  /**
   * Get questions
   */
  async getQuestions(): Promise<AskFmQuestion[]> {
    if (!this.username) {
      throw new Error('Username not configured');
    }

    const html = await this.makeRequest('GET', `/${this.username}/questions`);

    // Parse HTML to extract questions
    // This is a simplified version - full implementation would use cheerio
    // to parse HTML properly

    return [];
  }

  /**
   * Get user profile
   */
  async getProfile(username?: string): Promise<any> {
    const user = username || this.username;

    if (!user) {
      throw new Error('Username not specified');
    }

    return await this.makeRequest('GET', `/${user}`);
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<any> {
    return await this.makeRequest('GET', `/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Follow user
   */
  async followUser(username: string): Promise<any> {
    return await this.makeRequest('POST', `/follow`, {
      username: username,
    });
  }

  /**
   * Unfollow user
   */
  async unfollowUser(username: string): Promise<any> {
    return await this.makeRequest('POST', `/unfollow`, {
      username: username,
    });
  }

  /**
   * Like answer
   */
  async likeAnswer(answerId: string): Promise<any> {
    return await this.makeRequest('POST', `/likes`, {
      answer_id: answerId,
    });
  }

  /**
   * Unlike answer
   */
  async unlikeAnswer(answerId: string): Promise<any> {
    return await this.makeRequest('POST', `/unlikes`, {
      answer_id: answerId,
    });
  }

  /**
   * Ask question to user
   */
  async askQuestion(username: string, question: string, anonymous: boolean = false): Promise<any> {
    return await this.makeRequest('POST', '/questions', {
      username: username,
      question: question,
      anonymous: anonymous ? 1 : 0,
    });
  }

  /**
   * Delete answer
   */
  async deleteAnswer(answerId: string): Promise<void> {
    this.logger.log(`Deleting answer: ${answerId}`);

    await this.makeRequest('POST', `/answers/${answerId}/delete`, {});
  }

  /**
   * Get followers
   */
  async getFollowers(): Promise<any> {
    if (!this.username) {
      throw new Error('Username not configured');
    }

    return await this.makeRequest('GET', `/${this.username}/followers`);
  }

  /**
   * Get following
   */
  async getFollowing(): Promise<any> {
    if (!this.username) {
      throw new Error('Username not configured');
    }

    return await this.makeRequest('GET', `/${this.username}/following`);
  }

  /**
   * Update profile
   */
  async updateProfile(updates: {
    bio?: string;
    location?: string;
    website?: string;
  }): Promise<any> {
    return await this.makeRequest('POST', '/settings/profile', updates);
  }

  /**
   * Upload photo
   */
  async uploadPhoto(photoUrl: string): Promise<string> {
    // This would need to handle file upload
    // Simplified version returns URL as-is

    return photoUrl;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    if (!this.username) {
      throw new Error('Username not configured');
    }

    const profile = await this.getProfile(this.username);

    // Extract statistics from profile
    // This would need HTML parsing in real implementation

    return {
      questions: 0,
      answers: 0,
      likes: 0,
      followers: 0,
      following: 0,
    };
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   */
  async createPost(data: { text?: string; mediaUrl?: string }): Promise<any> {
    if (!data.text) {
      throw new Error('Text is required for ASK.fm posts');
    }

    return await this.postShoutout(data.text, data.mediaUrl);
  }

  /**
   * Get post (answer) by ID
   */
  async getPost(answerId: string): Promise<any> {
    // ASK.fm doesn't have a direct API for this
    // Would need to scrape the answer page

    return await this.makeRequest('GET', `/answers/${answerId}`);
  }

  /**
   * Delete post (answer)
   */
  async deletePost(answerId: string): Promise<void> {
    await this.deleteAnswer(answerId);
  }

  /**
   * List posts (recent answers)
   */
  async listPosts(options?: { limit?: number }): Promise<any[]> {
    const questions = await this.getQuestions();

    return questions.slice(0, options?.limit || 10);
  }

  /**
   * Get pending questions (unanswered)
   */
  async getPendingQuestions(): Promise<AskFmQuestion[]> {
    return await this.makeRequest('GET', '/inbox');
  }

  /**
   * Ignore question (don't answer)
   */
  async ignoreQuestion(questionId: string): Promise<void> {
    await this.makeRequest('POST', `/questions/${questionId}/ignore`, {});
  }

  /**
   * Report content
   */
  async reportContent(contentId: string, reason: string): Promise<any> {
    return await this.makeRequest('POST', '/reports', {
      content_id: contentId,
      reason: reason,
    });
  }
}
