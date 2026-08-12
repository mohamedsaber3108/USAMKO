import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/decorators/roles.decorator';

// DTOs
export class CreateWebhookDto {
  url!: string;
  events!: string[];
  secret?: string;
  metadata?: any;
}

export class UpdateWebhookDto {
  url?: string;
  events?: string[];
  active?: boolean;
  metadata?: any;
}

@ApiTags('Webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Create a new webhook subscription
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Create a new webhook subscription' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or events' })
  async createWebhook(@Body() dto: CreateWebhookDto) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.createWebhook(tenantId, dto.url, dto.events, dto.secret, dto.metadata);
  }

  /**
   * Get all webhook subscriptions
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get all webhook subscriptions' })
  @ApiResponse({ status: 200, type: [Object] })
  async getWebhooks() {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.getWebhooks(tenantId);
  }

  /**
   * Get webhook subscription by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get webhook subscription by ID' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async getWebhook(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.getWebhook(tenantId, id);
  }

  /**
   * Update webhook subscription
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update webhook subscription' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async updateWebhook(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.updateWebhook(tenantId, id, dto);
  }

  /**
   * Delete webhook subscription
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Delete webhook subscription' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  async deleteWebhook(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.deleteWebhook(tenantId, id);
  }

  /**
   * Test webhook endpoint
   */
  @Post(':id/test')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook test completed' })
  @ApiResponse({ status: 400, description: 'Webhook test failed' })
  async testWebhook(@Param('id') id: string, @Body() dto?: { payload?: any }) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.testWebhook(tenantId, id, dto?.payload);
  }

  /**
   * Get webhook logs
   */
  @Get(':id/logs')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get webhook logs' })
  @ApiResponse({ status: 200, type: [Object] })
  async getWebhookLogs(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.getWebhookLogs(id);
  }

  /**
   * Get webhook statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, type: Object })
  async getWebhookStats() {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.webhookService.getWebhookStats(tenantId);
  }

  /**
   * Trigger a webhook manually
   */
  @Post('trigger')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Trigger a webhook manually' })
  @ApiResponse({ status: 200, description: 'Webhook triggered' })
  async triggerWebhook(@Body() dto: { event: string; data?: any }) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    // In production, validate event type against WebhookEvent
    return this.webhookService.triggerWebhook(dto.event as any, dto.data || {}, tenantId);
  }
}