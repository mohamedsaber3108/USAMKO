/**
 * Telegram Platform Adapter
 *
 * Implements Telegram Bot API integration for USAMKO.
 * Uses Telegram Bot API for sending messages, media, and managing channels.
 *
 * API Documentation: https://core.telegram.org/bots/api
 *
 * Installation:
 * npm install node-telegram-bot-api @types/node-telegram-bot-api
 */

import { Injectable, Logger } from '@nestjs/common';
import { PlatformAccount } from '../platform.model';

export interface TelegramConfig {
  botToken: string;
  chatId?: string;
  channelId?: string;
}

export interface TelegramMessage {
  chat_id: string | number;
  text?: string;
  photo?: string;
  video?: string;
  document?: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_notification?: boolean;
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Telegram Adapter
 *
 * Features:
 * - Send text messages
 * - Send photos
 * - Send videos
 * - Send documents
 * - Post to channels
 * - Pin messages
 * - Get chat info
 *
 * @example
 * const adapter = new TelegramAdapter(platformAccount);
 * await adapter.sendMessage({
 *   chat_id: '@my_channel',
 *   text: 'Hello from USAMKO!'
 * });
 */
@Injectable()
export class TelegramAdapter {
  private readonly logger = new Logger(TelegramAdapter.name);
  private readonly baseUrl = 'https://api.telegram.org';
  private botToken: string;
  private chatId?: string;

  constructor(private readonly account: PlatformAccount) {
    // Bot token should be stored in accessToken
    this.botToken = account.accessToken || '';

    // Parse metadata for chat/channel ID
    if (account.metadata && typeof account.metadata === 'object') {
      const metadata = account.metadata as any;
      this.chatId = metadata.chatId || metadata.channelId;
    }
  }

  /**
   * Send API request to Telegram
   */
  private async makeRequest(
    method: string,
    data?: any,
  ): Promise<TelegramResponse> {
    const url = `${this.baseUrl}/bot${this.botToken}/${method}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(
          `Telegram API error: ${result.description || 'Unknown error'}`
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Telegram API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendMessage(message: TelegramMessage): Promise<any> {
    this.logger.log(`Sending message to Telegram chat: ${message.chat_id}`);

    return await this.makeRequest('sendMessage', {
      chat_id: message.chat_id,
      text: message.text,
      parse_mode: message.parse_mode || 'HTML',
      disable_notification: message.disable_notification || false,
    });
  }

  /**
   * Send photo
   */
  async sendPhoto(photo: string, caption?: string, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    this.logger.log(`Sending photo to Telegram chat: ${targetChatId}`);

    return await this.makeRequest('sendPhoto', {
      chat_id: targetChatId,
      photo: photo,
      caption: caption,
      parse_mode: 'HTML',
    });
  }

  /**
   * Send video
   */
  async sendVideo(video: string, caption?: string, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    this.logger.log(`Sending video to Telegram chat: ${targetChatId}`);

    return await this.makeRequest('sendVideo', {
      chat_id: targetChatId,
      video: video,
      caption: caption,
      parse_mode: 'HTML',
    });
  }

  /**
   * Send document
   */
  async sendDocument(document: string, caption?: string, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    this.logger.log(`Sending document to Telegram chat: ${targetChatId}`);

    return await this.makeRequest('sendDocument', {
      chat_id: targetChatId,
      document: document,
      caption: caption,
      parse_mode: 'HTML',
    });
  }

  /**
   * Get chat information
   */
  async getChat(chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('getChat', {
      chat_id: targetChatId,
    });
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<any> {
    return await this.makeRequest('getMe');
  }

  /**
   * Pin message
   */
  async pinMessage(messageId: number, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('pinChatMessage', {
      chat_id: targetChatId,
      message_id: messageId,
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: number, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('deleteMessage', {
      chat_id: targetChatId,
      message_id: messageId,
    });
  }

  /**
   * Get chat member count
   */
  async getChatMemberCount(chatId?: string): Promise<number> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    const result = await this.makeRequest('getChatMemberCount', {
      chat_id: targetChatId,
    });

    return result.result as number;
  }

  /**
   * Send message with keyboard (inline buttons)
   */
  async sendMessageWithKeyboard(
    text: string,
    buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>>,
    chatId?: string,
  ): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('sendMessage', {
      chat_id: targetChatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  }

  /**
   * Edit message text
   */
  async editMessageText(
    messageId: number,
    text: string,
    chatId?: string,
  ): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('editMessageText', {
      chat_id: targetChatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
    });
  }

  /**
   * Forward message
   */
  async forwardMessage(
    fromChatId: string,
    messageId: number,
    toChatId?: string,
  ): Promise<any> {
    const targetChatId = toChatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('forwardMessage', {
      chat_id: targetChatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    });
  }

  /**
   * Set chat title
   */
  async setChatTitle(title: string, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('setChatTitle', {
      chat_id: targetChatId,
      title: title,
    });
  }

  /**
   * Set chat description
   */
  async setChatDescription(description: string, chatId?: string): Promise<any> {
    const targetChatId = chatId || this.chatId;

    if (!targetChatId) {
      throw new Error('Chat ID not specified');
    }

    return await this.makeRequest('setChatDescription', {
      chat_id: targetChatId,
      description: description,
    });
  }

  /**
   * Create post (for USAMKO platform adapter interface)
   */
  async createPost(data: { text?: string; mediaUrl?: string }): Promise<any> {
    if (!this.chatId) {
      throw new Error('Chat ID not configured for this account');
    }

    if (data.mediaUrl) {
      // Determine media type from URL
      const isVideo = /\.(mp4|mov|avi)$/i.test(data.mediaUrl);
      const isPhoto = /\.(jpg|jpeg|png|gif)$/i.test(data.mediaUrl);

      if (isVideo) {
        return await this.sendVideo(data.mediaUrl, data.text, this.chatId);
      } else if (isPhoto) {
        return await this.sendPhoto(data.mediaUrl, data.text, this.chatId);
      } else {
        return await this.sendDocument(data.mediaUrl, data.text, this.chatId);
      }
    } else if (data.text) {
      return await this.sendMessage({
        chat_id: this.chatId,
        text: data.text,
      });
    } else {
      throw new Error('Either text or mediaUrl must be provided');
    }
  }

  /**
   * Get post (message) by ID
   */
  async getPost(messageId: string): Promise<any> {
    // Telegram doesn't have a direct "get message" API
    // You can only get messages via updates/webhooks
    throw new Error('Get message by ID not supported by Telegram API');
  }

  /**
   * Delete post (message)
   */
  async deletePost(messageId: string): Promise<void> {
    await this.deleteMessage(parseInt(messageId, 10));
  }

  /**
   * List posts (not supported by Telegram Bot API)
   */
  async listPosts(): Promise<any[]> {
    // Telegram Bot API doesn't support listing messages
    throw new Error('List messages not supported by Telegram Bot API');
  }

  /**
   * Refresh access token (not required for Telegram bots)
   */
  async refreshAccessToken?(): Promise<string> {
    // Telegram bot tokens don't expire
    throw new Error('Token refresh not required for Telegram bots');
  }
}
