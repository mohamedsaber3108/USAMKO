import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AIOrchestrationService } from './ai-orchestration.service';
import { ModelRegistryService } from './model-registry.service';
import { CostTrackerService } from './cost-tracker.service';
import { PromptCacheService } from './prompt-cache.service';
import { BudgetManagerService } from './budget-manager.service';
import { TaskClassifierService } from './task-classifier.service';

/**
 * AI Orchestration Controller
 * Provides REST API for AI model routing and cost optimization
 */
@Controller('ai')
export class AIOrchestrationController {
  private readonly logger = new Logger(AIOrchestrationController.name);

  constructor(
    private readonly orchestrationService: AIOrchestrationService,
    private readonly modelRegistry: ModelRegistryService,
    private readonly costTracker: CostTrackerService,
    private readonly promptCache: PromptCacheService,
    private readonly budgetManager: BudgetManagerService,
    private readonly taskClassifier: TaskClassifierService,
  ) {}

  /**
   * Execute AI task with automatic model selection
   */
  @Post('execute')
  async execute(@Body() body: {
    tenantId: string;
    userId: string;
    taskName?: string;
    prompt: string;
    systemPrompt?: string;
    context?: Record<string, any>;
    minQuality?: number;
    maxLatency?: number;
    maxCost?: number;
    temperature?: number;
    useCache?: boolean;
    preferredProvider?: string;
  }) {
    return this.orchestrationService.execute(body);
  }

  /**
   * Execute batch of AI tasks
   */
  @Post('execute-batch')
  async executeBatch(@Body() body: {
    tenantId: string;
    userId: string;
    requests: Array<{
      taskName?: string;
      prompt: string;
      systemPrompt?: string;
    }>;
    useCache?: boolean;
  }) {
    return this.orchestrationService.executeBatch(body);
  }

  /**
   * Get all available AI models
   */
  @Get('models')
  async getModels(@Query('enabled') enabled?: string) {
    if (enabled === 'true') {
      return this.modelRegistry.getEnabledModels();
    }
    return this.modelRegistry.getAllModels();
  }

  /**
   * Get model by ID
   */
  @Get('models/:id')
  async getModelById(@Query('id') id: string) {
    return this.modelRegistry.getModelById(id);
  }

  /**
   * Get models by tier
   */
  @Get('models/tier/:tier')
  async getModelsByTier(@Query('tier') tier: string) {
    return this.modelRegistry.getModelsByTier(tier as any);
  }

  /**
   * Get models by provider
   */
  @Get('models/provider/:provider')
  async getModelsByProvider(@Query('provider') provider: string) {
    return this.modelRegistry.getModelsByProvider(provider as any);
  }

  /**
   * Get cost analytics
   */
  @Get('cost/analytics')
  async getCostAnalytics(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.costTracker.getCostAnalytics(tenantId, period);
  }

  /**
   * Get cost savings from optimization
   */
  @Get('cost/savings')
  async getCostSavings(
    @Query('tenantId') tenantId: string,
    @Query('period') period?: 'month',
  ) {
    return this.costTracker.getCostSavings(tenantId, period);
  }

  /**
   * Get user spending
   */
  @Get('cost/user/:userId')
  async getUserSpending(
    @Query('userId') userId: string,
    @Query('months') months?: number,
  ) {
    return this.costTracker.getUserSpending(userId, months);
  }

  /**
   * Get cache statistics
   */
  @Get('cache/statistics')
  async getCacheStatistics() {
    return this.promptCache.getStatistics();
  }

  /**
   * Get top cached prompts
   */
  @Get('cache/top')
  async getTopCached(@Query('limit') limit?: number) {
    return this.promptCache.getTopCached(limit);
  }

  /**
   * Get cache savings estimate
   */
  @Get('cache/savings')
  async getCacheSavings(@Query('period') period?: 'day' | 'week' | 'month') {
    return this.promptCache.estimateSavings(period);
  }

  /**
   * Clear cache
   */
  @Post('cache/clear')
  async clearCache(@Body() body: { modelId?: string; all?: boolean }) {
    if (body.all) {
      return { cleared: await this.promptCache.clearAll() };
    }
    if (body.modelId) {
      return { cleared: await this.promptCache.clearForModel(body.modelId) };
    }
    return { cleared: await this.promptCache.clearExpired() };
  }

  /**
   * Get budget status
   */
  @Get('budget/status')
  async getBudgetStatus(@Query('tenantId') tenantId: string) {
    return this.budgetManager.getBudgetStatus(tenantId);
  }

  /**
   * Get budget projection
   */
  @Get('budget/projection')
  async getBudgetProjection(@Query('tenantId') tenantId: string) {
    return this.budgetManager.getProjection(tenantId);
  }

  /**
   * Set budget
   */
  @Post('budget/set')
  async setBudget(@Body() body: {
    tenantId: string;
    limitAmount: number;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    alertThreshold?: number;
    enabled?: boolean;
  }) {
    return this.budgetManager.setBudget(body);
  }

  /**
   * Update budget
   */
  @Post('budget/update')
  async updateBudget(@Body() body: {
    budgetId: string;
    limitAmount?: number;
    alertThreshold?: number;
    enabled?: boolean;
  }) {
    return this.budgetManager.updateBudget(body.budgetId, body);
  }

  /**
   * Disable budget
   */
  @Post('budget/disable')
  async disableBudget(@Body() body: { tenantId: string }) {
    return { disabled: await this.budgetManager.disableBudget(body.tenantId) };
  }

  /**
   * Get budget history
   */
  @Get('budget/history')
  async getBudgetHistory(@Query('tenantId') tenantId: string) {
    return this.budgetManager.getBudgetHistory(tenantId);
  }

  /**
   * Get all task templates
   */
  @Get('tasks/templates')
  async getTaskTemplates() {
    return this.taskClassifier.getAllTemplates();
  }

  /**
   * Get task templates by category
   */
  @Get('tasks/templates/category/:category')
  async getTemplatesByCategory(@Query('category') category: string) {
    return this.taskClassifier.getTemplatesByCategory(category);
  }

  /**
   * Create task template
   */
  @Post('tasks/templates')
  async createTaskTemplate(@Body() body: {
    name: string;
    category: string;
    description: string;
    complexity: string;
    qualityMin: number;
    maxLatencyMs?: number;
    recommendedModels?: string[];
  }) {
    return this.taskClassifier.createTaskTemplate(body as any);
  }

  /**
   * Initialize default templates
   */
  @Post('tasks/templates/initialize')
  async initializeDefaultTemplates() {
    await this.taskClassifier.initializeDefaultTemplates();
    return { message: 'Default task templates initialized' };
  }

  /**
   * Initialize default AI models
   */
  @Post('models/initialize')
  async initializeDefaultModels() {
    await this.modelRegistry.initializeDefaultModels();
    return { message: 'Default AI models initialized' };
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck() {
    const models = await this.modelRegistry.getEnabledModels();
    return {
      status: 'ok',
      enabledModels: models.length,
      timestamp: new Date().toISOString(),
    };
  }
}
