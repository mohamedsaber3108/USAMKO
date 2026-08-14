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
  enabled: boolean;
  description?: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookLog {
  id: string;
  subscriptionId: string;
  tenantId: string;
  event: string;
  payload: any;
  response: any | null;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  attempts: number;
  sentAt: Date;
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
        enabled: true,
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
    data: Partial<{ url: string; events: string[]; enabled: boolean; metadata: any }>,
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
          subscriptionId: webhook.id,
          tenantId: webhook.tenantId,
          event: 'test',
          payload: testPayload,
          statusCode: response.status,
          response: { body: responseBody } as any,
          success: response.ok,
          attempts: 1,
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
          subscriptionId: webhook.id,
          tenantId: webhook.tenantId,
          event: 'test',
          payload: testPayload,
          statusCode: null,
          response: { body: error.message } as any,
          success: false,
          attempts: 1,
          error: error.message,
        },
      });

      throw new BadRequestException(`Webhook test failed: ${error.message}`);
    }
  }

  /**
   * Trigger a webhook for an event
   */
  async triggerWebhook(event: WebhookEvent, data: any, tenantId: string) {
    const allWebhooks = await this.prisma.webhookSubscription.findMany({
      where: {
        tenantId,
        enabled: true,
      },
    });

    // Filter webhooks that are subscribed to this event
    const webhooks = allWebhooks.filter(w =>
      Array.isArray(w.events) && w.events.includes(event)
    );

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
  private async sendWebhook(subscription: any, payload: WebhookPayload) {
    const signature = this.generateSignature(JSON.stringify(payload), subscription.secret);

    let lastError: string | null = null;

    // Retry logic with exponential backoff (3 attempts)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(subscription.url, {
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
            subscriptionId: subscription.id,
            tenantId: subscription.tenantId,
            event: payload.event,
            payload: payload as any,
            statusCode: response.status,
            response: { body: responseBody } as any,
            success: response.ok,
            attempts: attempt + 1,
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
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        event: payload.event,
        payload: payload as any,
        response: null,
        statusCode: null,
        success: false,
        attempts: 3,
        error: lastError,
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
        attempts: { lt: 3 },
        sentAt: {
          lt: new Date(Date.now() - 60 * 1000), // At least 1 minute ago
        },
      },
      include: {
        subscription: true,
      },
    });

    for (const log of failedLogs) {
      try {
        const payload = typeof log.payload === 'string'
          ? JSON.parse(log.payload)
          : log.payload;

        await this.sendWebhook(log.subscription, payload);
      } catch (error) {
        // Log retry failure
        await this.prisma.webhookLog.create({
          data: {
            subscriptionId: log.subscriptionId,
            tenantId: log.tenantId,
            event: log.event,
            payload: log.payload,
            statusCode: null,
            response: { error: error.message } as any,
            success: false,
            attempts: 3,
            error: error.message,
          },
        });
      }
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(subscriptionId: string, limit: number = 50) {
    return this.prisma.webhookLog.findMany({
      where: { subscriptionId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get webhook logs for tenant
   */
  async getTenantWebhookLogs(tenantId: string, limit: number = 50) {
    return this.prisma.webhookLog.findMany({
      where: {
        subscription: { tenantId },
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      include: {
        subscription: true,
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
      where: { tenantId, enabled: true },
    });

    const totalLogs = await this.prisma.webhookLog.count({
      where: {
        subscription: { tenantId },
      },
    });

    const successfulLogs = await this.prisma.webhookLog.count({
      where: {
        subscription: { tenantId },
        success: true,
      },
    });

    const failedLogs = await this.prisma.webhookLog.count({
      where: {
        subscription: { tenantId },
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