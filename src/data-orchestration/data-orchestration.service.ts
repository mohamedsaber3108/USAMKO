import { Injectable, Logger } from '@nestjs/common';
import { QueryPlannerService } from './query-planner.service';
import { OrchestratorService } from './orchestrator.service';
import { SourceRegistryService } from './source-registry.service';
import { CacheService } from './cache.service';

/**
 * Main Data Orchestration Service
 * Provides high-level API for natural language data collection
 */
@Injectable()
export class DataOrchestrationService {
  private readonly logger = new Logger(DataOrchestrationService.name);

  constructor(
    private readonly queryPlanner: QueryPlannerService,
    private readonly orchestrator: OrchestratorService,
    private readonly sourceRegistry: SourceRegistryService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Execute natural language query (end-to-end)
   */
  async executeQuery(params: {
    tenantId: string;
    userId: string;
    query: string;
    preferences?: {
      preferFree?: boolean;
      maxCost?: number;
      minQuality?: number;
    };
  }) {
    this.logger.log(`Executing query: "${params.query}"`);

    try {
      // Step 1: Plan query
      const plan = await this.queryPlanner.planQuery({
        tenantId: params.tenantId,
        userId: params.userId,
        query: params.query,
        preferences: params.preferences,
      });

      this.logger.log(
        `Plan created: ${plan.steps.length} steps, est. ${plan.estimatedTotalResults} results`,
      );

      // Step 2: Execute workflow
      const result = await this.orchestrator.executeWorkflow(
        params.tenantId,
        params.userId,
        plan,
      );

      this.logger.log(
        `Query completed: ${result.totalCount} records, $${result.totalCost.toFixed(4)}`,
      );

      return {
        success: true,
        workflowId: result.workflowId,
        query: params.query,
        plan: {
          steps: plan.steps.length,
          estimatedResults: plan.estimatedTotalResults,
          estimatedCost: plan.estimatedTotalCost,
        },
        result: {
          records: result.records,
          totalCount: result.totalCount,
          stepsCompleted: result.stepsCompleted,
          stepsTotal: result.stepsTotal,
          totalCost: result.totalCost,
          totalLatencyMs: result.totalLatencyMs,
        },
      };
    } catch (error) {
      this.logger.error(`Query execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Plan query without executing (preview)
   */
  async planQuery(params: {
    tenantId: string;
    userId: string;
    query: string;
    preferences?: {
      preferFree?: boolean;
      maxCost?: number;
      minQuality?: number;
    };
  }) {
    const plan = await this.queryPlanner.planQuery({
      tenantId: params.tenantId,
      userId: params.userId,
      query: params.query,
      preferences: params.preferences,
    });

    return {
      query: params.query,
      target: plan.target,
      criteria: plan.criteria,
      steps: plan.steps,
      estimates: {
        totalResults: plan.estimatedTotalResults,
        totalCost: plan.estimatedTotalCost,
        duration: plan.estimatedDuration,
      },
    };
  }

  /**
   * Get available data sources
   */
  async getAvailableSources() {
    const sources = await this.sourceRegistry.getAllSources();

    return sources.map((source) => ({
      slug: source.slug,
      name: source.name,
      type: source.type,
      provider: source.provider,
      capabilities: source.capabilities,
      costPerQuery: source.costPerQuery,
      quality: source.quality,
      enabled: source.enabled,
    }));
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(sourceSlug?: string, period?: 'day' | 'week' | 'month') {
    if (sourceSlug) {
      return this.sourceRegistry.getSourceStatistics(sourceSlug, period);
    } else {
      return this.sourceRegistry.getAllSourceStatistics(period);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics() {
    return this.cache.getStatistics();
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate(period?: 'day' | 'week' | 'month') {
    return this.cache.estimateHitRate(period);
  }

  /**
   * Clear cache
   */
  async clearCache(options?: { sourceSlug?: string; expired?: boolean; all?: boolean }) {
    if (options?.all) {
      return { cleared: await this.cache.clearAll() };
    }

    if (options?.sourceSlug) {
      return { cleared: await this.cache.clearForSource(options.sourceSlug) };
    }

    if (options?.expired) {
      return { cleared: await this.cache.clearExpired() };
    }

    return { cleared: await this.cache.clearExpired() };
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string) {
    return this.orchestrator.getWorkflowStatus(workflowId);
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId: string) {
    await this.orchestrator.cancelWorkflow(workflowId);
    return { message: 'Workflow cancelled', workflowId };
  }

  /**
   * Get plan statistics
   */
  async getPlanStatistics(tenantId: string) {
    return this.queryPlanner.getPlanStatistics(tenantId);
  }

  /**
   * Enable/disable data source
   */
  async setSourceEnabled(sourceSlug: string, enabled: boolean) {
    await this.sourceRegistry.setSourceEnabled(sourceSlug, enabled);
    return {
      message: `Source ${sourceSlug} ${enabled ? 'enabled' : 'disabled'}`,
      sourceSlug,
      enabled,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const sources = await this.sourceRegistry.getAllSources();
    const enabledSources = sources.filter((s) => s.enabled);
    const cacheStats = await this.cache.getStatistics();

    return {
      status: 'ok',
      dataSources: {
        total: sources.length,
        enabled: enabledSources.length,
        disabled: sources.length - enabledSources.length,
      },
      cache: {
        entries: cacheStats.totalEntries,
        hits: cacheStats.totalHits,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Example queries (for documentation/testing)
   */
  getExampleQueries() {
    return [
      {
        query: 'Find CTOs in San Francisco working at tech companies',
        target: 'people',
        estimatedResults: 100,
        estimatedCost: 0,
      },
      {
        query: 'Get contact information for marketing managers at Fortune 500 companies',
        target: 'people',
        estimatedResults: 500,
        estimatedCost: 0,
      },
      {
        query: 'Find SaaS companies in New York with more than 50 employees',
        target: 'companies',
        estimatedResults: 200,
        estimatedCost: 0,
      },
      {
        query: 'List coffee shops in downtown Seattle',
        target: 'locations',
        estimatedResults: 50,
        estimatedCost: 0.85, // Google Maps API cost
      },
      {
        query: 'Find software engineers who work at Google and live in California',
        target: 'people',
        estimatedResults: 300,
        estimatedCost: 0,
      },
    ];
  }
}
