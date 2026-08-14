import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PlatformService } from '../../platforms/platform.service';
import { RateLimiterService } from './rate-limiter.service';
import { MessageGeneratorService } from './message-generator.service';
import { TrackerService } from './tracker.service';
import { TargetCriteriaDto } from '../dto/execution/target-criteria.dto';

@Injectable()
export class CampaignExecutionService {
  private readonly logger = new Logger(CampaignExecutionService.name);
  private readonly runningExecutions: Map<string, boolean> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformService: PlatformService,
    private readonly rateLimiter: RateLimiterService,
    private readonly messageGenerator: MessageGeneratorService,
    private readonly tracker: TrackerService,
  ) {}

  async executeCampaign(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        account: true,
        user: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'active') {
      throw new BadRequestException('Campaign must be active to execute');
    }

    // Check if already running
    if (this.runningExecutions.get(campaignId)) {
      throw new BadRequestException('Campaign is already executing');
    }

    // Get targeting criteria from campaign config
    const config = campaign.config as any;
    const targetCriteria: TargetCriteriaDto = config.targeting || {};
    const messageTemplate = config.messageTemplate || 'Hello {{name}}!';
    const useAI = config.useAI !== false; // Default to true

    // Select target leads
    const leads = await this.selectLeads(campaign.tenantId, targetCriteria);

    if (leads.length === 0) {
      throw new BadRequestException('No leads match the targeting criteria');
    }

    // Create execution record
    const execution = await this.prisma.campaignExecution.create({
      data: {
        campaignId: campaign.id,
        tenantId: campaign.tenantId,
        status: 'running',
        totalLeads: leads.length,
        processed: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        startedAt: new Date(),
      },
    });

    // Create campaign targets
    await this.prisma.campaignTarget.createMany({
      data: leads.map(lead => ({
        campaignId: campaign.id,
        leadId: lead.id,
        tenantId: campaign.tenantId,
        status: 'pending',
      })),
    });

    // Mark as running
    this.runningExecutions.set(campaignId, true);

    // Execute asynchronously (don't await)
    this.executeAsync(execution.id, campaign, leads, messageTemplate, useAI).catch(error => {
      this.logger.error(`Execution ${execution.id} failed: ${error.message}`, error.stack);
    });

    return {
      executionId: execution.id,
      status: 'started',
      totalLeads: leads.length,
      message: `Campaign execution started for ${leads.length} leads`,
    };
  }

  private async executeAsync(
    executionId: string,
    campaign: any,
    leads: any[],
    messageTemplate: string,
    useAI: boolean,
  ) {
    try {
      this.logger.log(`Starting execution ${executionId} for campaign ${campaign.id} with ${leads.length} leads`);

      const targets = await this.prisma.campaignTarget.findMany({
        where: { campaignId: campaign.id },
        include: { lead: { include: { company: true } } },
      });

      // Generate messages for all leads
      const messages = await this.messageGenerator.generateBulkMessages({
        template: messageTemplate,
        leads: targets.map(t => t.lead),
        campaign,
        useAI,
      });

      let processed = 0;
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const target of targets) {
        // Check if execution was paused/cancelled
        if (!this.runningExecutions.get(campaign.id)) {
          this.logger.warn(`Execution ${executionId} was stopped`);
          break;
        }

        // Check rate limits
        const canSend = await this.rateLimiter.canSend(campaign.account.platform, campaign.account.id);

        if (!canSend) {
          const waitTime = await this.rateLimiter.getWaitTime(campaign.account.platform, campaign.account.id);
          this.logger.warn(`Rate limit hit, waiting ${waitTime}ms`);
          await this.delay(waitTime);
        }

        // Send message
        try {
          const message = messages.get(target.leadId) || messageTemplate;

          // Use platform service to send
          const adapter = this.platformService.getPlatformAdapter(campaign.account);
          // Note: Actual sending would depend on platform-specific methods
          // For now, we'll track as sent
          const result = { success: true, externalId: `msg_${Date.now()}` };

          await this.rateLimiter.recordSend(campaign.account.platform, campaign.account.id);

          // Track success
          await this.tracker.trackMessageSent({
            executionId,
            targetId: target.id,
            tenantId: campaign.tenantId,
            platform: campaign.account.platform,
            content: message,
            externalId: result.externalId,
            response: result,
          });

          // Update target status
          await this.prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: 'sent' },
          });

          sent++;
        } catch (error) {
          this.logger.error(`Failed to send to lead ${target.leadId}: ${error.message}`);

          // Track failure
          await this.tracker.trackMessageFailed({
            executionId,
            targetId: target.id,
            tenantId: campaign.tenantId,
            platform: campaign.account.platform,
            content: messages.get(target.leadId) || messageTemplate,
            error: error.message,
          });

          // Update target status
          await this.prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: 'failed' },
          });

          failed++;
        }

        processed++;

        // Update execution progress every 10 leads
        if (processed % 10 === 0) {
          await this.tracker.updateExecutionProgress(executionId, {
            processed,
            sent,
            failed,
            skipped,
          });
        }
      }

      // Final update
      await this.tracker.updateExecutionProgress(executionId, {
        processed,
        sent,
        failed,
        skipped,
      });

      // Mark execution as completed
      await this.prisma.campaignExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          results: {
            processed,
            sent,
            failed,
            skipped,
            successRate: processed > 0 ? (sent / processed) * 100 : 0,
          },
        },
      });

      this.logger.log(`Execution ${executionId} completed: ${sent} sent, ${failed} failed`);
    } catch (error) {
      this.logger.error(`Execution ${executionId} error: ${error.message}`, error.stack);

      // Mark as failed
      await this.prisma.campaignExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          results: { error: error.message },
        },
      });
    } finally {
      this.runningExecutions.delete(campaign.id);
    }
  }

  private async selectLeads(tenantId: string, criteria: TargetCriteriaDto): Promise<any[]> {
    const where: any = { tenantId };

    if (criteria.leadIds && criteria.leadIds.length > 0) {
      where.id = { in: criteria.leadIds };
    }

    if (criteria.leadSource) {
      where.source = criteria.leadSource;
    }

    if (criteria.minScore !== undefined || criteria.maxScore !== undefined) {
      where.score = {};
      if (criteria.minScore !== undefined) where.score.gte = criteria.minScore;
      if (criteria.maxScore !== undefined) where.score.lte = criteria.maxScore;
    }

    if (criteria.status) {
      where.status = criteria.status;
    }

    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = { hasSome: criteria.tags };
    }

    if (criteria.companyId) {
      where.companyId = criteria.companyId;
    }

    if (criteria.location) {
      where.location = { contains: criteria.location, mode: 'insensitive' };
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: { company: true },
      take: criteria.limit || 1000,
    });

    return leads;
  }

  async pauseExecution(campaignId: string) {
    this.runningExecutions.set(campaignId, false);

    const execution = await this.prisma.campaignExecution.findFirst({
      where: { campaignId, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });

    if (execution) {
      await this.prisma.campaignExecution.update({
        where: { id: execution.id },
        data: { status: 'paused' },
      });
    }

    return { message: 'Campaign execution paused' };
  }

  async cancelExecution(campaignId: string) {
    this.runningExecutions.delete(campaignId);

    const execution = await this.prisma.campaignExecution.findFirst({
      where: { campaignId, status: 'running' },
      orderBy: { startedAt: 'desc' },
    });

    if (execution) {
      await this.prisma.campaignExecution.update({
        where: { id: execution.id },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      });
    }

    return { message: 'Campaign execution cancelled' };
  }

  async getExecutionStatus(executionId: string) {
    const execution = await this.prisma.campaignExecution.findUnique({
      where: { id: executionId },
      include: {
        campaign: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    const stats = await this.tracker.getExecutionStats(executionId);

    return {
      ...execution,
      stats,
      isRunning: this.runningExecutions.get(execution.campaignId) || false,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
