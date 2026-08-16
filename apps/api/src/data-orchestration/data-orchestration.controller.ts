import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Tenant as TenantDecorator } from '../common/decorators/tenant.decorator';
import { User as UserDecorator } from '../common/decorators/user.decorator';
import { DataOrchestrator } from './orchestrator.service';
import { DataCollectionRequest, SourceCapability } from './sources/source.interface';
import { PrismaService } from '../prisma.service';
import { AICollectionOrchestratorService } from './ai-collection-orchestrator.service';

// DTOs
export class CollectDataDto {
  query!: string;
  entityType!: 'person' | 'company' | 'event' | 'place' | 'product' | 'custom';
  fields?: string[];
  sources?: string[];
  maxResults?: number;
  timeout?: number;
  filters?: Record<string, any>;
  location?: string;
  enrichWithEmail?: boolean;
  enrichWithPhone?: boolean;
  autoScore?: boolean;
  deduplicate?: boolean;
  validate?: boolean;
  saveAsLeads?: boolean;
}

@ApiTags('Data Orchestration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data')
export class DataOrchestrationController {
  constructor(
    private orchestrator: DataOrchestrator,
    private prisma: PrismaService,
    private aiCollectionOrchestrator: AICollectionOrchestratorService,
  ) {}

  /**
   * Get available data sources
   */
  @Get('sources')
  @ApiOperation({ summary: 'Get all available data sources' })
  @ApiResponse({ status: 200, description: 'List of available sources' })
  async getSources() {
    const sources = this.orchestrator.getAvailableSources();
    return {
      total: sources.length,
      sources: sources.map((s) => ({
        id: s.config.id,
        name: s.config.name,
        type: s.config.type,
        capabilities: s.config.capabilities,
        requiresAuth: s.config.requiresAuth,
        requiresBrowser: s.config.requiresBrowser,
        priority: s.config.priority,
        reliability: s.config.reliability,
        enabled: s.config.enabled,
      })),
    };
  }

  /**
   * Get sources by capability
   */
  @Get('sources/by-capability/:capability')
  @ApiOperation({ summary: 'Get sources by capability' })
  @ApiResponse({ status: 200, description: 'List of sources with capability' })
  async getSourcesByCapability(@Body('capability') capability: SourceCapability) {
    const sources = this.orchestrator.getSourcesByCapability(capability);
    return {
      capability,
      count: sources.length,
      sources: sources.map((s) => s.config.name),
    };
  }

  /**
   * AI-powered natural language data collection
   */
  @Post('collect/ai')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Collect data using natural language query' })
  @ApiResponse({ status: 200, description: 'Data collection successful' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async collectWithAI(
    @TenantDecorator('id') tenantId: string,
    @UserDecorator('id') userId: string,
    @Body() body: { query: string; saveAsLeads?: boolean },
  ) {
    const result = await this.aiCollectionOrchestrator.collectWithAI({
      query: body.query,
      tenantId,
      userId,
    });

    // Save as leads if requested
    if (body.saveAsLeads && result.results.length > 0) {
      await this.saveAsLeads(result.results, tenantId, userId);
    }

    return result;
  }

  /**
   * Unified data collection endpoint
   */
  @Post('collect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Collect data from multiple sources' })
  @ApiResponse({ status: 200, description: 'Data collection successful' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async collectData(
    @TenantDecorator('id') tenantId: string,
    @UserDecorator('id') userId: string,
    @Body() dto: CollectDataDto,
  ) {
    // Build request
    const request: DataCollectionRequest = {
      query: dto.query,
      entityType: dto.entityType,
      fields: dto.fields,
      sources: dto.sources,
      maxResults: dto.maxResults,
      timeout: dto.timeout,
      filters: dto.filters,
      location: dto.location,
      enrichWithEmail: dto.enrichWithEmail,
      enrichWithPhone: dto.enrichWithPhone,
      autoScore: dto.autoScore,
      deduplicate: dto.deduplicate,
      validate: dto.validate,
      tenantId,
      userId,
    };

    // Execute orchestrated collection
    const result = await this.orchestrator.collect(request);

    // Save as leads if requested
    if (dto.saveAsLeads && result.items.length > 0) {
      await this.saveAsLeads(result.items, tenantId, userId);
    }

    return {
      success: result.status !== 'failed',
      status: result.status,
      collected: result.totalReturned,
      sources: result.sourceResults.map((sr) => ({
        source: sr.sourceId,
        found: sr.found,
        used: sr.used,
      })),
      items: result.items,
      stats: {
        totalFound: result.totalFound,
        normalized: result.normalized,
        deduplicated: result.deduplicated,
        validated: result.validated,
        enriched: result.enriched,
        executionTime: result.executionTime,
      },
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Health check for all sources
   */
  @Get('health')
  @ApiOperation({ summary: 'Check health of all data sources' })
  @ApiResponse({ status: 200, description: 'Health status of all sources' })
  async healthCheck() {
    const sources = this.orchestrator.getAvailableSources();
    const healthChecks = await Promise.all(
      sources.map(async (source) => {
        try {
          const healthy = await source.healthCheck();
          return {
            id: source.config.id,
            name: source.config.name,
            healthy,
          };
        } catch (error) {
          return {
            id: source.config.id,
            name: source.config.name,
            healthy: false,
            error: error.message,
          };
        }
      }),
    );

    return {
      overall: healthChecks.every((h) => h.healthy) ? 'healthy' : 'degraded',
      sources: healthChecks,
    };
  }

  /**
   * Save normalized items as leads
   */
  private async saveAsLeads(items: any[], tenantId: string, userId: string) {
    const leads = items.map((item) => ({
      tenantId,
      userId,
      fullName: item.fullName || 'Unknown',
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      title: item.title,
      companyId: undefined, // Would need to look up or create company
      source: item.sources?.join(',') || 'unknown',
      sourceUrl: item.sourceUrl,
      linkedinUrl: item.linkedinUrl,
      location: item.location,
      score: item.score || 0,
      status: 'NEW',
      metadata: item.metadata || {},
    }));

    await this.prisma.lead.createMany({
      data: leads,
      skipDuplicates: true,
    });
  }
}
