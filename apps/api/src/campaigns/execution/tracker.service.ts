import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackMessageSent(params: {
    executionId: string;
    targetId: string;
    tenantId: string;
    platform: string;
    content: string;
    externalId?: string;
    response?: any;
  }) {
    try {
      const message = await this.prisma.campaignMessage.create({
        data: {
          executionId: params.executionId,
          targetId: params.targetId,
          tenantId: params.tenantId,
          platform: params.platform,
          content: params.content,
          status: 'sent',
          externalId: params.externalId,
          response: params.response || null,
          sentAt: new Date(),
        },
      });

      this.logger.debug(`Tracked message sent: ${message.id}`);
      return message;
    } catch (error) {
      this.logger.error(`Failed to track message: ${error.message}`);
      throw error;
    }
  }

  async trackMessageFailed(params: {
    executionId: string;
    targetId: string;
    tenantId: string;
    platform: string;
    content: string;
    error: string;
  }) {
    try {
      const message = await this.prisma.campaignMessage.create({
        data: {
          executionId: params.executionId,
          targetId: params.targetId,
          tenantId: params.tenantId,
          platform: params.platform,
          content: params.content,
          status: 'failed',
          error: params.error,
        },
      });

      this.logger.debug(`Tracked message failed: ${message.id}`);
      return message;
    } catch (error) {
      this.logger.error(`Failed to track failed message: ${error.message}`);
      throw error;
    }
  }

  async updateExecutionProgress(executionId: string, stats: {
    processed?: number;
    sent?: number;
    failed?: number;
    skipped?: number;
  }) {
    try {
      const current = await this.prisma.campaignExecution.findUnique({
        where: { id: executionId },
      });

      if (!current) {
        throw new Error('Execution not found');
      }

      await this.prisma.campaignExecution.update({
        where: { id: executionId },
        data: {
          processed: stats.processed !== undefined ? stats.processed : current.processed,
          sent: stats.sent !== undefined ? stats.sent : current.sent,
          failed: stats.failed !== undefined ? stats.failed : current.failed,
          skipped: stats.skipped !== undefined ? stats.skipped : current.skipped,
          updatedAt: new Date(),
        },
      });

      this.logger.debug(`Updated execution progress: ${executionId}`);
    } catch (error) {
      this.logger.error(`Failed to update execution progress: ${error.message}`);
      throw error;
    }
  }

  async getExecutionStats(executionId: string) {
    const execution = await this.prisma.campaignExecution.findUnique({
      where: { id: executionId },
      include: {
        messages: {
          select: {
            status: true,
            platform: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
          },
        },
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    const stats = {
      total: execution.totalLeads,
      processed: execution.processed,
      sent: execution.sent,
      failed: execution.failed,
      skipped: execution.skipped,
      delivered: execution.messages.filter(m => m.deliveredAt).length,
      read: execution.messages.filter(m => m.readAt).length,
      byPlatform: {} as Record<string, { sent: number; delivered: number; read: number }>,
    };

    // Calculate per-platform stats
    execution.messages.forEach(msg => {
      if (!stats.byPlatform[msg.platform]) {
        stats.byPlatform[msg.platform] = { sent: 0, delivered: 0, read: 0 };
      }
      if (msg.status === 'sent') stats.byPlatform[msg.platform].sent++;
      if (msg.deliveredAt) stats.byPlatform[msg.platform].delivered++;
      if (msg.readAt) stats.byPlatform[msg.platform].read++;
    });

    return stats;
  }

  async getCampaignStats(campaignId: string) {
    const executions = await this.prisma.campaignExecution.findMany({
      where: { campaignId },
      include: {
        messages: {
          select: {
            status: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
          },
        },
      },
    });

    const totalStats = {
      executions: executions.length,
      totalLeads: executions.reduce((sum, e) => sum + e.totalLeads, 0),
      sent: executions.reduce((sum, e) => sum + e.sent, 0),
      failed: executions.reduce((sum, e) => sum + e.failed, 0),
      delivered: 0,
      read: 0,
      deliveryRate: 0,
      readRate: 0,
    };

    executions.forEach(exec => {
      totalStats.delivered += exec.messages.filter(m => m.deliveredAt).length;
      totalStats.read += exec.messages.filter(m => m.readAt).length;
    });

    if (totalStats.sent > 0) {
      totalStats.deliveryRate = (totalStats.delivered / totalStats.sent) * 100;
      totalStats.readRate = (totalStats.read / totalStats.sent) * 100;
    }

    return totalStats;
  }
}
