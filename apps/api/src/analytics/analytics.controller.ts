import { Controller, Get, Query, Param, ParseUUIDPipe, Header, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { OverviewStats, PlatformStat, CampaignStat, EngagementStat, GrowthStat, TopPost, ContentPerformance } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant as TenantDecorator } from '../common/decorators/tenant.decorator';

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get overview statistics for the dashboard
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get overview statistics' })
  @ApiResponse({ status: 200, description: 'Overview statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getOverview(
    @TenantDecorator('id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OverviewStats> {
    return this.analyticsService.getOverviewStats(tenantId, {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    });
  }

  /**
   * Get platform-specific statistics
   */
  @Get('platforms/:platform')
  @ApiOperation({ summary: 'Get platform-specific statistics' })
  @ApiParam({ name: 'platform', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  async getPlatformStats(
    @TenantDecorator('id') tenantId: string,
    @Param('platform') platform?: string,
  ): Promise<PlatformStat[]> {
    return this.analyticsService.getPlatformStats(tenantId, platform);
  }

  /**
   * Get campaign-specific statistics
   */
  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign-specific statistics' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Campaign statistics' })
  async getCampaignStats(
    @TenantDecorator('id') tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CampaignStat> {
    return this.analyticsService.getCampaignStats(tenantId, id);
  }

  /**
   * Get engagement statistics
   */
  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement statistics' })
  @ApiResponse({ status: 200, description: 'Engagement statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getEngagement(
    @TenantDecorator('id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EngagementStat> {
    return this.analyticsService.getEngagementStats(tenantId, {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    });
  }

  /**
   * Get follower growth statistics
   */
  @Get('growth')
  @ApiOperation({ summary: 'Get follower growth statistics' })
  @ApiResponse({ status: 200, description: 'Growth statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getGrowth(
    @TenantDecorator('id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<GrowthStat> {
    return this.analyticsService.getGrowthStats(tenantId, {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    });
  }

  /**
   * Get top performing posts
   */
  @Get('top-posts')
  @ApiOperation({ summary: 'Get top performing posts' })
  @ApiResponse({ status: 200, description: 'Top posts' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getTopPosts(
    @TenantDecorator('id') tenantId: string,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopPost[]> {
    return this.analyticsService.getTopPosts(tenantId, limit, {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    });
  }

  /**
   * Get content performance analysis
   */
  @Get('content-performance')
  @ApiOperation({ summary: 'Get content performance analysis' })
  @ApiResponse({ status: 200, description: 'Content performance' })
  async getContentPerformance(
    @TenantDecorator('id') tenantId: string,
  ): Promise<ContentPerformance[]> {
    return this.analyticsService.getContentPerformance(tenantId);
  }

  /**
   * Export analytics data
   */
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=analytics-export.csv')
  @ApiOperation({ summary: 'Export analytics data as CSV' })
  @ApiResponse({ status: 200, description: 'CSV file with analytics data' })
  @ApiQuery({ name: 'format', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async exportAnalytics(
    @TenantDecorator('id') tenantId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<string | object> {
    return this.analyticsService.exportAnalytics(tenantId, format);
  }
}
