import { Injectable, Logger } from '@nestjs/common';
import { ModelRouterService } from './model-router.service';
import { CostTrackerService } from './cost-tracker.service';
import { PromptCacheService } from './prompt-cache.service';
import { BudgetManagerService } from './budget-manager.service';
import { ModelRegistryService } from './model-registry.service';
import { AIModel, AIProvider } from '@prisma/client';

/**
 * Main AI Orchestration Service
 * This is the entry point for all AI operations in the platform
 */
@Injectable()
export class AIOrchestrationService {
  private readonly logger = new Logger(AIOrchestrationService.name);

  constructor(
    private readonly modelRouter: ModelRouterService,
    private readonly costTracker: CostTrackerService,
    private readonly promptCache: PromptCacheService,
    private readonly budgetManager: BudgetManagerService,
    private readonly modelRegistry: ModelRegistryService,
  ) {}

  /**
   * Execute AI task with automatic model selection and cost optimization
   */
  async execute(params: {
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
  }): Promise<{
    response: string;
    model: string;
    modelId: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
    cached: boolean;
    classification?: any;
    reasoning?: string;
  }> {
    const startTime = Date.now();

    this.logger.log(
      `Executing AI task: ${params.taskName || 'unnamed'} for tenant ${params.tenantId}`,
    );

    try {
      // Step 1: Check budget (throws if exceeded)
      await this.budgetManager.checkBudget(params.tenantId);

      // Step 2: Check cache
      if (params.useCache !== false) {
        const cached = await this.promptCache.get(params.prompt);
        if (cached) {
          this.logger.log(`Cache HIT - returning cached response`);
          const model = await this.modelRegistry.getModelById(cached.modelId);

          return {
            response: cached.response,
            model: model?.name || 'unknown',
            modelId: cached.modelId,
            provider: model?.provider || 'unknown',
            inputTokens: cached.inputTokens,
            outputTokens: cached.outputTokens,
            cost: 0, // Cached = free!
            latencyMs: Date.now() - startTime,
            cached: true,
          };
        }
        this.logger.debug(`Cache MISS - will call model`);
      }

      // Step 3: Select best model for this task
      const selection = await this.modelRouter.selectModel({
        taskName: params.taskName,
        prompt: params.prompt,
        context: params.context,
        minQuality: params.minQuality,
        maxLatency: params.maxLatency,
        maxCost: params.maxCost,
        preferredProvider: params.preferredProvider,
      });

      const model = selection.model;

      this.logger.log(
        `Selected model: ${model.name} (${model.provider}) - ${selection.reasoning}`,
      );

      // Step 4: Execute request with selected model
      try {
        const result = await this.callModel(model, {
          prompt: params.prompt,
          systemPrompt: params.systemPrompt,
          temperature: params.temperature,
        });

        const latencyMs = Date.now() - startTime;

        // Step 5: Track usage and cost
        await this.costTracker.trackUsage({
          tenantId: params.tenantId,
          userId: params.userId,
          model: model,
          taskName: params.taskName,
          taskComplexity: selection.classification.complexity,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs,
          success: true,
        });

        // Step 6: Cache response for future use
        if (params.useCache !== false) {
          await this.promptCache.set({
            prompt: params.prompt,
            modelId: model.id,
            response: result.response,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          });
        }

        this.logger.log(
          `Task completed successfully in ${latencyMs}ms. Cost: $${result.cost.toFixed(4)}`,
        );

        return {
          response: result.response,
          model: model.name,
          modelId: model.id,
          provider: model.provider,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost: result.cost,
          latencyMs,
          cached: false,
          classification: selection.classification,
          reasoning: selection.reasoning,
        };
      } catch (error) {
        // Step 7: Handle model failure - try fallback
        this.logger.error(`Model ${model.name} failed: ${error.message}`);

        // Track failed usage
        await this.costTracker.trackUsage({
          tenantId: params.tenantId,
          userId: params.userId,
          model: model,
          taskName: params.taskName,
          taskComplexity: selection.classification.complexity,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          success: false,
          errorMessage: error.message,
        });

        // Try fallback model (one tier up)
        return this.executeFallback(params, model);
      }
    } catch (error) {
      this.logger.error(`AI orchestration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute with fallback model
   */
  private async executeFallback(
    params: any,
    failedModel: AIModel,
  ): Promise<any> {
    this.logger.warn(`Attempting fallback for failed model: ${failedModel.name}`);

    const fallbackModel = await this.modelRouter.getFallbackModel(failedModel, true);

    if (!fallbackModel) {
      throw new Error(
        `No fallback model available after ${failedModel.name} failed`,
      );
    }

    this.logger.log(`Using fallback model: ${fallbackModel.name}`);

    const startTime = Date.now();

    try {
      const result = await this.callModel(fallbackModel, {
        prompt: params.prompt,
        systemPrompt: params.systemPrompt,
        temperature: params.temperature,
      });

      const latencyMs = Date.now() - startTime;

      // Track fallback usage
      await this.costTracker.trackUsage({
        tenantId: params.tenantId,
        userId: params.userId,
        model: fallbackModel,
        taskName: params.taskName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs,
        success: true,
      });

      this.logger.log(`Fallback succeeded with ${fallbackModel.name}`);

      return {
        response: result.response,
        model: fallbackModel.name,
        modelId: fallbackModel.id,
        provider: fallbackModel.provider,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
        latencyMs,
        cached: false,
        fallback: true,
      };
    } catch (error) {
      this.logger.error(`Fallback also failed: ${error.message}`);
      throw new Error(
        `Both primary (${failedModel.name}) and fallback (${fallbackModel.name}) models failed`,
      );
    }
  }

  /**
   * Call AI model via appropriate provider
   * NOTE: This is a stub - actual provider integration needed
   */
  private async callModel(
    model: AIModel,
    params: {
      prompt: string;
      systemPrompt?: string;
      temperature?: number;
    },
  ): Promise<{
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }> {
    this.logger.debug(`Calling model ${model.name} via ${model.provider}`);

    // TODO: Implement actual provider calls
    // For now, this is a stub that demonstrates the interface

    switch (model.provider) {
      case AIProvider.AWS_BEDROCK:
        return this.callBedrockModel(model, params);

      case AIProvider.OPENAI:
        return this.callOpenAIModel(model, params);

      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Call AWS Bedrock model
   * TODO: Implement actual Bedrock integration
   */
  private async callBedrockModel(
    model: AIModel,
    params: any,
  ): Promise<any> {
    // Placeholder for Bedrock integration
    // Replace with actual BedrockRuntimeClient calls
    throw new Error(
      'AWS Bedrock integration not yet implemented. ' +
      'Implement this using @aws-sdk/client-bedrock-runtime',
    );
  }

  /**
   * Call OpenAI model
   * TODO: Implement actual OpenAI integration
   */
  private async callOpenAIModel(
    model: AIModel,
    params: any,
  ): Promise<any> {
    // Placeholder for OpenAI integration
    // Replace with actual OpenAI API calls
    throw new Error(
      'OpenAI integration not yet implemented. ' +
      'Implement this using the OpenAI SDK',
    );
  }

  /**
   * Batch execute multiple prompts
   */
  async executeBatch(params: {
    tenantId: string;
    userId: string;
    requests: Array<{
      taskName?: string;
      prompt: string;
      systemPrompt?: string;
    }>;
    useCache?: boolean;
  }): Promise<any[]> {
    this.logger.log(`Executing batch of ${params.requests.length} requests`);

    const results = await Promise.all(
      params.requests.map((request) =>
        this.execute({
          tenantId: params.tenantId,
          userId: params.userId,
          taskName: request.taskName,
          prompt: request.prompt,
          systemPrompt: request.systemPrompt,
          useCache: params.useCache,
        }).catch((error) => ({
          error: error.message,
          request,
        })),
      ),
    );

    return results;
  }

  /**
   * Stream AI response (for real-time use cases)
   * TODO: Implement streaming support
   */
  async executeStream(params: any): Promise<any> {
    throw new Error('Streaming not yet implemented');
  }

  /**
   * Get execution summary
   */
  getSummary(result: any): string {
    return [
      `Model: ${result.model} (${result.provider})`,
      `Tokens: ${result.inputTokens + result.outputTokens}`,
      `Cost: $${result.cost.toFixed(4)}`,
      `Latency: ${result.latencyMs}ms`,
      result.cached ? 'Cached: YES' : 'Cached: NO',
    ].join(' | ');
  }
}
