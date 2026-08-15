import { Injectable, Logger } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { TaskClassifierService } from './task-classifier.service';
import { AIModel, ModelTier } from '@prisma/client';

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);

  constructor(
    private readonly modelRegistry: ModelRegistryService,
    private readonly taskClassifier: TaskClassifierService,
  ) {}

  /**
   * Select best model for task (MAIN ROUTING LOGIC)
   */
  async selectModel(params: {
    taskName?: string;
    prompt: string;
    context?: Record<string, any>;
    minQuality?: number;
    maxLatency?: number;
    maxCost?: number;
    preferredProvider?: string;
  }): Promise<{
    model: AIModel;
    classification: any;
    reasoning: string;
  }> {
    this.logger.log(`Selecting model for task: ${params.taskName || 'unnamed'}`);

    // Step 1: Classify task complexity
    const classification = await this.taskClassifier.classifyTask({
      taskName: params.taskName,
      prompt: params.prompt,
      context: params.context,
      minQuality: params.minQuality,
      maxLatency: params.maxLatency,
    });

    this.logger.debug(
      `Task classified as ${classification.complexity} -> ${classification.recommendedTier}`,
    );

    // Step 2: Get candidate models for this tier
    let candidates = await this.modelRegistry.getModelsByTier(
      classification.recommendedTier,
    );

    if (candidates.length === 0) {
      this.logger.warn(
        `No models found for tier ${classification.recommendedTier}, falling back`,
      );
      candidates = await this.modelRegistry.getEnabledModels();
    }

    // Step 3: Filter by requirements
    let filtered = this.filterByRequirements(candidates, {
      minQuality: classification.minQuality,
      maxLatency: classification.maxLatencyMs,
      maxCost: params.maxCost,
      preferredProvider: params.preferredProvider,
      promptLength: params.prompt.length,
    });

    // If no models match, relax constraints
    if (filtered.length === 0) {
      this.logger.warn('No models match all constraints, relaxing requirements');
      filtered = candidates;
    }

    // Step 4: Sort by cost-effectiveness (best quality per dollar)
    const ranked = this.rankByCostEffectiveness(filtered);

    // Step 5: Select best match
    const selected = ranked[0];

    if (!selected) {
      throw new Error('No suitable model found');
    }

    const reasoning = this.buildReasoningExplanation(
      selected,
      classification,
      ranked.length,
    );

    this.logger.log(
      `Selected ${selected.name} (${selected.tier}) for ${classification.complexity} task`,
    );

    return {
      model: selected,
      classification,
      reasoning,
    };
  }

  /**
   * Filter models by requirements
   */
  private filterByRequirements(
    models: AIModel[],
    requirements: {
      minQuality?: number;
      maxLatency?: number;
      maxCost?: number;
      preferredProvider?: string;
      promptLength?: number;
    },
  ): AIModel[] {
    return models.filter((model) => {
      // Quality check
      if (
        requirements.minQuality &&
        model.qualityScore < requirements.minQuality
      ) {
        return false;
      }

      // Latency check (estimated)
      if (requirements.maxLatency) {
        const estimatedLatency = this.estimateLatency(
          model,
          requirements.promptLength || 100,
        );
        if (estimatedLatency > requirements.maxLatency) {
          return false;
        }
      }

      // Cost check
      if (requirements.maxCost) {
        const avgCost = (model.costInput + model.costOutput) / 2;
        if (avgCost > requirements.maxCost) {
          return false;
        }
      }

      // Provider preference
      if (requirements.preferredProvider) {
        if (model.provider !== requirements.preferredProvider) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Rank models by cost-effectiveness
   * Higher score = better value (quality per dollar)
   */
  private rankByCostEffectiveness(models: AIModel[]): AIModel[] {
    return models.sort((a, b) => {
      const scoreA = this.calculateCostEffectiveness(a);
      const scoreB = this.calculateCostEffectiveness(b);
      return scoreB - scoreA; // Descending (best first)
    });
  }

  /**
   * Calculate cost-effectiveness score
   */
  private calculateCostEffectiveness(model: AIModel): number {
    // Average cost per 1K tokens
    const avgCostPer1K = (model.costInput + model.costOutput) / 2 / 1000;

    // Quality per dollar (higher is better)
    const qualityPerDollar = model.qualityScore / avgCostPer1K;

    // Factor in speed
    const adjustedScore = qualityPerDollar * model.speedScore;

    return adjustedScore;
  }

  /**
   * Estimate latency for model
   */
  private estimateLatency(model: AIModel, promptLength: number): number {
    // Rough estimation: 1 token ~= 4 characters
    const estimatedTokens = promptLength / 4;

    // Base latency + token processing time
    const baseLatency = 500; // 500ms base
    const tokenTime = (estimatedTokens / model.speedScore) * 0.1;

    return baseLatency + tokenTime;
  }

  /**
   * Estimate cost for request
   */
  estimateCost(model: AIModel, prompt: string, expectedOutputTokens: number = 0): number {
    const inputTokens = prompt.length / 4; // Rough estimation
    const outputTokens = expectedOutputTokens || inputTokens * 0.5; // Default: 50% of input

    const costInput = (inputTokens / 1_000_000) * model.costInput;
    const costOutput = (outputTokens / 1_000_000) * model.costOutput;

    return costInput + costOutput;
  }

  /**
   * Build reasoning explanation
   */
  private buildReasoningExplanation(
    selected: AIModel,
    classification: any,
    candidateCount: number,
  ): string {
    const avgCost = (selected.costInput + selected.costOutput) / 2;

    return [
      `Task complexity: ${classification.complexity}`,
      `Recommended tier: ${classification.recommendedTier}`,
      `Selected: ${selected.name} (${selected.provider})`,
      `Quality score: ${(selected.qualityScore * 100).toFixed(0)}%`,
      `Avg cost: $${avgCost.toFixed(2)} per 1M tokens`,
      `Evaluated ${candidateCount} candidate models`,
      classification.reasoning,
    ].join(' | ');
  }

  /**
   * Get fallback model (if primary fails)
   */
  async getFallbackModel(
    failedModel: AIModel,
    tierUp: boolean = true,
  ): Promise<AIModel | null> {
    const targetTier = tierUp ? this.getNextTierUp(failedModel.tier) : failedModel.tier;

    const fallbackCandidates = await this.modelRegistry.getModelsByTier(targetTier);

    // Exclude the failed model
    const filtered = fallbackCandidates.filter((m) => m.id !== failedModel.id);

    if (filtered.length === 0) {
      return null;
    }

    // Return highest priority
    return filtered.sort((a, b) => b.priority - a.priority)[0];
  }

  /**
   * Get next tier up for fallback
   */
  private getNextTierUp(currentTier: ModelTier): ModelTier {
    const tierOrder = [
      ModelTier.NANO,
      ModelTier.SMALL,
      ModelTier.MEDIUM,
      ModelTier.LARGE,
      ModelTier.PREMIUM,
    ];

    const currentIndex = tierOrder.indexOf(currentTier);
    const nextIndex = Math.min(currentIndex + 1, tierOrder.length - 1);

    return tierOrder[nextIndex];
  }

  /**
   * Get model comparison
   */
  async compareModels(modelIds: string[]) {
    const models = await Promise.all(
      modelIds.map((id) => this.modelRegistry.getModelById(id)),
    );

    return models.filter((m): m is AIModel => m !== null).map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      tier: model.tier,
      qualityScore: model.qualityScore,
      speedScore: model.speedScore,
      costInput: model.costInput,
      costOutput: model.costOutput,
      avgCost: (model.costInput + model.costOutput) / 2,
      costEffectiveness: this.calculateCostEffectiveness(model),
    }));
  }
}
