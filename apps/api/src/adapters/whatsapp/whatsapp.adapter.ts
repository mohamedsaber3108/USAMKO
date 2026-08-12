// WhatsApp Business adapter for messaging integration

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PlatformAccount } from '../../platforms/platform.model';

export interface WhatsAppMessageOptions {
  template_name?: string;
  language_code?: string;
  media_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface WhatsAppMessage {
  id: string;
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'image' | 'video' | 'document' | 'location';
  timestamp: string;
  recipient_id?: string;
}

@Injectable()
export class WhatsAppAdapter {
  private api: AxiosInstance;
  private apiVersion = 'v18.0';

  constructor() {
    this.api = axios.create({
      baseURL: 'https://graph.facebook.com',
      timeout: 30000,
    });
  }

  /**
   * Send a WhatsApp text message
   */
  async sendTextMessage(
    account: PlatformAccount,
    recipientId: string,
    content: string,
    options: WhatsAppMessageOptions = {}
  ): Promise<WhatsAppMessage> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: {
            body: content,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
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
   * Send a WhatsApp media message
   */
  async sendMediaMessage(
    account: PlatformAccount,
    recipientId: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'document',
    caption?: string
  ): Promise<WhatsAppMessage> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
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
   * Send a WhatsApp location message
   */
  async sendLocationMessage(
    account: PlatformAccount,
    recipientId: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<WhatsAppMessage> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'location',
          location: {
            latitude,
            longitude,
            name,
            address,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
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
   * Send a WhatsApp template message
   */
  async sendTemplateMessage(
    account: PlatformAccount,
    recipientId: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ): Promise<WhatsAppMessage> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.post(
        `/${account.username}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components || [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
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
   * Get message status
   */
  async getMessageStatus(account: PlatformAccount, messageId: string): Promise<any> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${messageId}`, {
        params: {
          access_token: account.accessToken,
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
   * Get business profile
   */
  async getBusinessProfile(account: PlatformAccount): Promise<any> {
    if (!account.accessToken) {
      throw new BadRequestException('Access token required');
    }

    try {
      const response = await this.api.get(`/${account.username}`, {
        params: {
          access_token: account.accessToken,
          fields: 'id,name,about,category,profile_picture_url,websites,emails,vertical',
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
