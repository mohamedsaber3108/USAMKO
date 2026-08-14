import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import {
  CampaignStatus,
  CampaignType,
  CampaignConfig,
  CampaignResult,
} from './interfaces/campaign.interface';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('campaigns') private campaignQueue: Queue,
  ) {}

  /**
   * Create a new campaign
   */
  async create(userId: string, tenantId: string, dto: CreateCampaignDto) {
    // Validate platforms
    const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'whatsapp'];
    const invalidPlatforms = dto.config.platforms.filter(
      p => !validPlatforms.includes(p),
    );

    if (invalidPlatforms.length > 0) {
      throw new BadRequestException(
        `Invalid platforms: ${invalidPlatforms.join(', ')}`,
      );
    }

    // Validate content based on campaign type
    this.validateCampaignContent(dto.type, dto.config as unknown as CampaignConfig);

    // Get first platform account for the campaign
    const platforms = (dto.config as any).platforms || [];
    const firstPlatform = platforms[0];
    const platformAccount = await this.prisma.platformAccount.findFirst({
      where: {
        tenantId,
        platform: firstPlatform,
        status: 'active',
      },
    });

    if (!platformAccount) {
      throw new BadRequestException(
        `No active platform account found for ${firstPlatform}`,
      );
    }

    // Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        userId,
        accountId: platformAccount.id,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: CampaignStatus.DRAFT,
        config: dto.config as any,
        results: {} as any,
      },
    });

    this.logger.log(`Campaign created: ${campaign.id}`);
    return campaign;
  }

  /**
   * Get all campaigns for a tenant
   */
  async findAll(
    tenantId: string,
    filters?: {
      status?: CampaignStatus;
      type?: CampaignType;
      userId?: string;
    },
  ) {
    const where: any = { tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get campaign by ID
   */
  async findOne(id: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  /**
   * Update campaign
   */
  async update(id: string, tenantId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id, tenantId);

    // Don't allow editing running campaigns
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot update running campaign');
    }

    // Validate if config is being updated
    if (dto.config) {
      this.validateCampaignContent(
        dto.type || (campaign.type as CampaignType),
        dto.config as unknown as CampaignConfig,
      );
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        config: dto.config as any,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Campaign updated: ${id}`);
    return updated;
  }

  /**
   * Delete campaign
   */
  async remove(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);

    // Don't allow deleting running campaigns
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete running campaign');
    }

    await this.prisma.campaign.delete({ where: { id } });

    this.logger.log(`Campaign deleted: ${id}`);
    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Start campaign execution
   */
  async start(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign is already running');
    }

    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Campaign already completed');
    }

    // Update status to running
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.RUNNING,
        updatedAt: new Date(),
      },
    });

    // Get campaign config
    const config = campaign.config as unknown as CampaignConfig;

    // Check if scheduled
    if (config.schedule?.startAt) {
      const startTime = new Date(config.schedule.startAt);
      const now = new Date();

      if (startTime > now) {
        // Schedule for future execution
        const delay = startTime.getTime() - now.getTime();
        await this.campaignQueue.add(
          'execute-campaign',
          { campaignId: id, tenantId },
          { delay },
        );

        this.logger.log(
          `Campaign ${id} scheduled for ${startTime.toISOString()}`,
        );
        return { message: 'Campaign scheduled successfully', startAt: startTime };
      }
    }

    // Execute immediately
    await this.campaignQueue.add('execute-campaign', { campaignId: id, tenantId });

    this.logger.log(`Campaign ${id} started`);
    return { message: 'Campaign started successfully' };
  }

  /**
   * Pause campaign
   */
  async pause(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign is not running');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
        updatedAt: new Date(),
      },
    });

    // Remove from queue
    const jobs = await this.campaignQueue.getJobs(['waiting', 'delayed', 'active']);
    for (const job of jobs) {
      if (job.data.campaignId === id) {
        await job.remove();
      }
    }

    this.logger.log(`Campaign ${id} paused`);
    return { message: 'Campaign paused successfully' };
  }

  /**
   * Resume paused campaign
   */
  async resume(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Campaign is not paused');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.RUNNING,
        updatedAt: new Date(),
      },
    });

    // Add back to queue
    await this.campaignQueue.add('execute-campaign', { campaignId: id, tenantId });

    this.logger.log(`Campaign ${id} resumed`);
    return { message: 'Campaign resumed successfully' };
  }

  /**
   * Cancel campaign
   */
  async cancel(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);

    if (
      campaign.status !== CampaignStatus.RUNNING &&
      campaign.status !== CampaignStatus.PAUSED &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException('Cannot cancel campaign in current status');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    // Remove from queue
    const jobs = await this.campaignQueue.getJobs(['waiting', 'delayed', 'active']);
    for (const job of jobs) {
      if (job.data.campaignId === id) {
        await job.remove();
      }
    }

    this.logger.log(`Campaign ${id} cancelled`);
    return { message: 'Campaign cancelled successfully' };
  }

  /**
   * Get campaign statistics
   */
  async getStats(id: string, tenantId: string) {
    const campaign = await this.findOne(id, tenantId);
    const results = campaign.results as unknown as CampaignResult;

    return {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      totalActions: results?.totalActions || 0,
      successCount: results?.successCount || 0,
      failureCount: results?.failureCount || 0,
      skipCount: results?.skipCount || 0,
      startedAt: results?.startedAt,
      completedAt: results?.completedAt,
      details: results?.details || {},
    };
  }

  /**
   * Update campaign results
   */
  async updateResults(
    campaignId: string,
    results: Partial<CampaignResult>,
    status?: CampaignStatus,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const currentResults = (campaign.results as unknown as CampaignResult) || {};
    const updatedResults = { ...currentResults, ...results };

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        results: updatedResults as any,
        status: status || campaign.status,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Campaign ${campaignId} results updated`);
  }

  /**
   * Validate campaign content based on type
   */
  private validateCampaignContent(type: CampaignType, config: CampaignConfig) {
    switch (type) {
      case CampaignType.POST:
      case CampaignType.BULK_POST:
        if (!config.content.text && !config.content.mediaUrls) {
          throw new BadRequestException('Post campaigns require text or media');
        }
        break;

      case CampaignType.MESSAGE:
      case CampaignType.BULK_MESSAGE:
        if (!config.content.text) {
          throw new BadRequestException('Message campaigns require text');
        }
        if (!config.targeting?.accounts || config.targeting.accounts.length === 0) {
          throw new BadRequestException('Message campaigns require target accounts');
        }
        break;

      case CampaignType.FOLLOW:
      case CampaignType.LIKE:
      case CampaignType.COMMENT:
        if (!config.targeting) {
          throw new BadRequestException(
            `${type} campaigns require targeting configuration`,
          );
        }
        break;
    }
  }
}
