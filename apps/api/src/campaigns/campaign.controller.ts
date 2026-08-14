import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User as UserDecorator } from '../common/decorators/user.decorator';
import { Tenant as TenantDecorator } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CampaignService } from './campaign.service';
import { CampaignExecutionService } from './execution/execution.service';
import { TrackerService } from './execution/tracker.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus, CampaignType } from './interfaces/campaign.interface';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly executionService: CampaignExecutionService,
    private readonly trackerService: TrackerService,
  ) {}

  /**
   * Create a new campaign
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UserDecorator('id') userId: string,
    @TenantDecorator('id') tenantId: string,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    return this.campaignService.create(userId, tenantId, createCampaignDto);
  }

  /**
   * Get all campaigns
   */
  @Get()
  async findAll(
    @TenantDecorator('id') tenantId: string,
    @Query('status') status?: CampaignStatus,
    @Query('type') type?: CampaignType,
    @Query('userId') userId?: string,
  ) {
    return this.campaignService.findAll(tenantId, { status, type, userId });
  }

  /**
   * Get campaign by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.findOne(id, tenantId);
  }

  /**
   * Get campaign statistics
   */
  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.getStats(id, tenantId);
  }

  /**
   * Update campaign
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, tenantId, updateCampaignDto);
  }

  /**
   * Delete campaign
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.remove(id, tenantId);
  }

  /**
   * Start campaign execution
   */
  @Post(':id/execute')
  async execute(
    @Param('id') id: string,
    @UserDecorator('id') userId: string,
  ) {
    return this.executionService.executeCampaign(id, userId);
  }

  /**
   * Pause running campaign execution
   */
  @Post(':id/pause')
  async pause(
    @Param('id') id: string,
  ) {
    return this.executionService.pauseExecution(id);
  }

  /**
   * Cancel campaign execution
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
  ) {
    return this.executionService.cancelExecution(id);
  }

  /**
   * Get campaign executions
   */
  @Get(':id/executions')
  async getExecutions(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    // Get all executions for this campaign
    return { executions: [], message: 'Implementation pending' };
  }

  /**
   * Get execution status
   */
  @Get('executions/:executionId')
  async getExecutionStatus(
    @Param('executionId') executionId: string,
  ) {
    return this.executionService.getExecutionStatus(executionId);
  }

  /**
   * Get campaign analytics
   */
  @Get(':id/analytics')
  async getAnalytics(
    @Param('id') id: string,
  ) {
    return this.trackerService.getCampaignStats(id);
  }
}
