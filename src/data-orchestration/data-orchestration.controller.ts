import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import { DataOrchestrationService } from './data-orchestration.service';

/**
 * Data Orchestration Controller
 * Provides REST API for natural language data collection
 */
@Controller('data')
export class DataOrchestrationController {
  private readonly logger = new Logger(DataOrchestrationController.name);

  constructor(
    private readonly dataOrchestration: DataOrchestrationService,
  ) {}

  /**
   * Execute natural language query
   */
  @Post('query')
  async executeQuery(@Body() body: {
    tenantId: string;
    userId: string;
    query: string;
    preferences?: {
      preferFree?: boolean;
      maxCost?: number;
      minQuality?: number;
    };
  }) {
    this.logger.log(`Query received: "${body.query}"`);
    return this.dataOrchestration.executeQuery(body);
  }

  /**
   * Plan query without executing (preview)
   */
  @Post('query/plan')
  async planQuery(@Body() body: {
    tenantId: string;
    userId: string;
    query: string;
    preferences?: {
      preferFree?: boolean;
      maxCost?: number;
      minQuality?: number;
    };
  }) {
    return this.dataOrchestration.planQuery(body);
  }

  /**
   * Get available data sources
   */
  @Get('sources')
  async getAvailableSources() {
    return this.dataOrchestration.getAvailableSources();
  }

  /**
   * Get data source statistics
   */
  @Get('sources/statistics')
  async getSourceStatistics(
    @Query('sourceSlug') sourceSlug?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.dataOrchestration.getSourceStatistics(sourceSlug, period);
  }

  /**
   * Enable/disable data source
   */
  @Post('sources/:slug/toggle')
  async toggleSource(
    @Param('slug') slug: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.dataOrchestration.setSourceEnabled(slug, body.enabled);
  }

  /**
   * Get workflow status
   */
  @Get('workflows/:id/status')
  async getWorkflowStatus(@Param('id') id: string) {
    return this.dataOrchestration.getWorkflowStatus(id);
  }

  /**
   * Cancel workflow
   */
  @Post('workflows/:id/cancel')
  async cancelWorkflow(@Param('id') id: string) {
    return this.dataOrchestration.cancelWorkflow(id);
  }

  /**
   * Get plan statistics
   */
  @Get('plans/statistics')
  async getPlanStatistics(@Query('tenantId') tenantId: string) {
    return this.dataOrchestration.getPlanStatistics(tenantId);
  }

  /**
   * Get cache statistics
   */
  @Get('cache/statistics')
  async getCacheStatistics() {
    return this.dataOrchestration.getCacheStatistics();
  }

  /**
   * Get cache hit rate
   */
  @Get('cache/hit-rate')
  async getCacheHitRate(@Query('period') period?: 'day' | 'week' | 'month') {
    return this.dataOrchestration.getCacheHitRate(period);
  }

  /**
   * Clear cache
   */
  @Post('cache/clear')
  async clearCache(@Body() body?: {
    sourceSlug?: string;
    expired?: boolean;
    all?: boolean;
  }) {
    return this.dataOrchestration.clearCache(body);
  }

  /**
   * Get example queries
   */
  @Get('examples')
  async getExampleQueries() {
    return this.dataOrchestration.getExampleQueries();
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck() {
    return this.dataOrchestration.healthCheck();
  }
}
