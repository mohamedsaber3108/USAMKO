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
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignStatus, CampaignType } from './interfaces/campaign.interface';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

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
  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.start(id, tenantId);
  }

  /**
   * Pause running campaign
   */
  @Post(':id/pause')
  async pause(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.pause(id, tenantId);
  }

  /**
   * Resume paused campaign
   */
  @Post(':id/resume')
  async resume(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.resume(id, tenantId);
  }

  /**
   * Cancel campaign
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @TenantDecorator('id') tenantId: string,
  ) {
    return this.campaignService.cancel(id, tenantId);
  }
}
