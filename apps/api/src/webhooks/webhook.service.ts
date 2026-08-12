import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

// Webhook event types
export type WebhookEvent = 
  | 'campaign.started'
  | 'campaign.completed'
  | 'campaign.failed'
  | 'post.published'
  | 'post.failed'
  | 'engagement.milestone'
  | 'error.occurred'
  | 'daily.summary'
  | 'platform.connected'
  | 'platform.disconnected';

export interface WebhookPayload {
  event: WebhookEvent;
  data: any;
  timestamp: Date;
  tenantId: string;
}

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  url: string;
  event: string;
  payload: any;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
}

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new webhook subscription
   */
  async createWebhook(
    tenantId: string,
    url: string,
    events: string[],
    secret?: string,
    metadata?: any,
  ): Promise<WebhookSubscription> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new BadRequestException('Invalid URL format');
    }

    // Validate events
    const validEvents = [
      'campaign.started',
      'campaign.completed',
      'campaign.failed',
      'post.published',
      'post.failed',
      'engagement.milestone',
      'error.occurred',
      'daily.summary',
      'platform.connected',
      'platform.disconnected',
    ];

    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    return this.prisma.webhookSubscription.create({
      data: {
        tenantId,
        url,
        events: events as any,
        secret: webhookSecret,
        active: true,
        metadata: metadata || {},
      },
    }) as any;
  }

  /**
   * Get all webhook subscriptions for a tenant
   */
  async getWebhooks(tenantId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get webhook subscription by ID
   */
  async getWebhook(tenantId: string, id: string): Promise<WebhookSubscription> {
    const webhook = await this.prisma.webhookSubscription.findUnique({
      where: { id, tenantId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook as any;
  }

  /**
   * Update webhook subscription
   */
  async updateWebhook(
    tenantId: string,
    id: string,
    data: Partial<{ url: string; events: string[]; active: boolean; metadata: any }>,
  ): Promise<WebhookSubscription> {
    // Validate events if provided
    if (data.events) {
      const validEvents = [
        'campaign.started',
        'campaign.completed',
        'campaign.failed',
        'post.published',
        'post.failed',
        'engagement.milestone',
        'error.occurred',
        'daily.summary',
        'platform.connected',
        'platform.disconnected',
      ];

      const invalidEvents = data.events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
      }
    }

    return this.prisma.webhookSubscription.update({
      where: { id, tenantId },
      data: data as any,
    }) as any;
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhook(tenantId: string, id: string) {
    return this.prisma.webhookSubscription.delete({
      where: { id, tenantId },
    });
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(tenantId: string, id: string, payload?: any) {
    const webhook = await this.getWebhook(tenantId, id);

    const testPayload = payload || {
      event: 'test',
      message: 'This is a test webhook',
      timestamp: new Date().toISOString(),
    };

    const signature = this.generateSignature(JSON.stringify(testPayload), webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: JSON.stringify(testPayload),
      });

      const responseBody = await response.text();

      // Log the test
      await this.prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          url: webhook.url,
          event: 'test',
          payload: testPayload,
          responseStatus: response.status,
          responseBody,
          success: response.ok,
          retryCount: 0,
        },
      });

      return {
        success: response.ok,
        status: response.status,
        responseBody,
      };
    } catch (error) {
      // Log the failed test
      await this.prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          url: webhook.url,
          event: 'test',
          payload: testPayload,
          responseStatus: null,
          responseBody: error.message,
          success: false,
          retryCount: 0,
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(`Webhook test failed: ${error.message}`);
    }
  }

  /**
   * Trigger a webhook for an event
   */
  async triggerWebhook(event: WebhookEvent, data: any, tenantId: string) {
    const webhooks = await this.prisma.webhookSubscription.findMany({
      where: {
        tenantId,
        active: true,
        events: { array_contains: [event] } as any,
      },
    });

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date(),
      tenantId,
    };

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, payload);
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(webhook: any, payload: WebhookPayload) {
    const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

    let lastError: string | null = null;

    // Retry logic with exponential backoff (3 attempts)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        // Log the webhook
        await this.prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            url: webhook.url,
            event: payload.event,
            payload: payload as any,
            responseStatus: response.status,
            responseBody,
            success: response.ok,
            retryCount: attempt,
          },
        });

        if (response.ok) {
          return; // Success, exit retry loop
        }

        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error.message;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    await this.prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        url: webhook.url,
        event: payload.event,
        payload: payload as any,
        responseStatus: null,
        responseBody: null,
        success: false,
        retryCount: 3,
        errorMessage: lastError,
      },
    });
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks() {
    const failedLogs = await this.prisma.webhookLog.findMany({
      where: {
        success: false,
        retryCount: { lt: 3 },
        createdAt: {
          lt: new Date(Date.now() - 60 * 1000), // At least 1 minute ago
        },
      },
      include: {
        webhook: true,
      },
    });

    for (const log of failedLogs) {
      try {
        const payload = typeof log.payload === 'string' 
          ? JSON.parse(log.payload) 
          : log.payload;

        await this.sendWebhook(log.webhook, payload);
      } catch (error) {
        // Log retry failure
        await this.prisma.webhookLog.create({
          data: {
            webhookId: log.webhookId,
            url: log.url,
            event: log.event,
            payload: log.payload,
            responseStatus: null,
            responseBody: error.message,
            success: false,
            retryCount: 3,
            errorMessage: error.message,
          },
        });
      }
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId: string, limit: number = 50) {
    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get webhook logs for tenant
   */
  async getTenantWebhookLogs(tenantId: string, limit: number = 50) {
    return this.prisma.webhookLog.findMany({
      where: {
        webhook: { tenantId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        webhook: true,
      },
    });
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(tenantId: string) {
    const total = await this.prisma.webhookSubscription.count({
      where: { tenantId },
    });

    const active = await this.prisma.webhookSubscription.count({
      where: { tenantId, active: true },
    });

    const totalLogs = await this.prisma.webhookLog.count({
      where: {
        webhook: { tenantId },
      },
    });

    const successfulLogs = await this.prisma.webhookLog.count({
      where: {
        webhook: { tenantId },
        success: true,
      },
    });

    const failedLogs = await this.prisma.webhookLog.count({
      where: {
        webhook: { tenantId },
        success: false,
      },
    });

    return {
      total,
      active,
      totalLogs,
      successfulLogs,
      failedLogs,
    };
  }

  // Helper methods
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}