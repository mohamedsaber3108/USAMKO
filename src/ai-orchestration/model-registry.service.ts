import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIModel, AIProvider, ModelTier } from '@prisma/client';

@Injectable()
export class ModelRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModelRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeDefaultModels();
  }

  /**
   * Initialize default AI models
   */
  async initializeDefaultModels(): Promise<void> {
    this.logger.log('Initializing AI model registry');

    const defaultModels = [
      // AWS Bedrock - Claude 3.5 Sonnet
      {
        provider: AIProvider.AWS_BEDROCK,
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        name: 'Claude 3.5 Sonnet',
        version: 'v2',
        maxTokens: 200000,
        supportsVision: true,
        supportsTools: true,
        costInput: 3.0,
        costOutput: 15.0,
        tier: ModelTier.MEDIUM,
        qualityScore: 0.95,
        speedScore: 0.85,
        enabled: true,
        priority: 90,
      },
      // AWS Bedrock - Claude 3 Haiku (Cheapest)
      {
        provider: AIProvider.AWS_BEDROCK,
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        version: 'v1',
        maxTokens: 200000,
        supportsVision: false,
        supportsTools: true,
        costInput: 0.25,
        costOutput: 1.25,
        tier: ModelTier.NANO,
        qualityScore: 0.75,
        speedScore: 0.98,
        enabled: true,
        priority: 80,
      },
      // AWS Bedrock - Claude 3 Opus (Best quality)
      {
        provider: AIProvider.AWS_BEDROCK,
        modelId: 'anthropic.claude-3-opus-20240229-v1:0',
        name: 'Claude 3 Opus',
        version: 'v1',
        maxTokens: 200000,
        supportsVision: true,
        supportsTools: true,
        costInput: 15.0,
        costOutput: 75.0,
        tier: ModelTier.PREMIUM,
        qualityScore: 0.98,
        speedScore: 0.70,
        enabled: true,
        priority: 70,
      },
      // OpenAI - GPT-4 Turbo
      {
        provider: AIProvider.OPENAI,
        modelId: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        version: 'turbo',
        maxTokens: 128000,
        supportsVision: true,
        supportsTools: true,
        costInput: 10.0,
        costOutput: 30.0,
        tier: ModelTier.LARGE,
        qualityScore: 0.92,
        speedScore: 0.80,
        enabled: true,
        priority: 85,
      },
      // OpenAI - GPT-3.5 Turbo (Budget option)
      {
        provider: AIProvider.OPENAI,
        modelId: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        version: 'turbo',
        maxTokens: 16000,
        supportsVision: false,
        supportsTools: true,
        costInput: 0.5,
        costOutput: 1.5,
        tier: ModelTier.SMALL,
        qualityScore: 0.78,
        speedScore: 0.92,
        enabled: true,
        priority: 78,
      },
    ];

    for (const modelData of defaultModels) {
      await this.prisma.aIModel.upsert({
        where: {
          provider_modelId: {
            provider: modelData.provider,
            modelId: modelData.modelId,
          },
        },
        update: modelData,
        create: modelData,
      });
    }

    this.logger.log(`Initialized ${defaultModels.length} AI models`);
  }

  /**
   * Get all models (including disabled)
   */
  async getAllModels(): Promise<AIModel[]> {
    return this.prisma.aIModel.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get all enabled models
   */
  async getEnabledModels(): Promise<AIModel[]> {
    return this.prisma.aIModel.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get models by tier
   */
  async getModelsByTier(tier: ModelTier): Promise<AIModel[]> {
    return this.prisma.aIModel.findMany({
      where: { enabled: true, tier },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get models by provider
   */
  async getModelsByProvider(provider: AIProvider): Promise<AIModel[]> {
    return this.prisma.aIModel.findMany({
      where: { enabled: true, provider },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId: string): Promise<AIModel | null> {
    return this.prisma.aIModel.findUnique({
      where: { id: modelId },
    });
  }

  /**
   * Find best model for criteria
   */
  async findBestModel(criteria: {
    tier?: ModelTier;
    provider?: AIProvider;
    minQuality?: number;
    maxCost?: number;
    supportsVision?: boolean;
    supportsTools?: boolean;
  }): Promise<AIModel | null> {
    const models = await this.prisma.aIModel.findMany({
      where: {
        enabled: true,
        ...(criteria.tier && { tier: criteria.tier }),
        ...(criteria.provider && { provider: criteria.provider }),
        ...(criteria.minQuality && { qualityScore: { gte: criteria.minQuality } }),
        ...(criteria.supportsVision !== undefined && {
          supportsVision: criteria.supportsVision,
        }),
        ...(criteria.supportsTools !== undefined && {
          supportsTools: criteria.supportsTools,
        }),
      },
      orderBy: [{ priority: 'desc' }, { costOutput: 'asc' }],
    });

    // Filter by max cost if specified
    if (criteria.maxCost) {
      return (
        models.find(
          (m) => (m.costInput + m.costOutput) / 2 <= criteria.maxCost,
        ) || null
      );
    }

    return models[0] || null;
  }

  /**
   * Get cheapest model for tier
   */
  async getCheapestModel(tier: ModelTier): Promise<AIModel | null> {
    const models = await this.getModelsByTier(tier);

    if (models.length === 0) return null;

    return models.reduce((cheapest, current) => {
      const cheapestAvgCost = (cheapest.costInput + cheapest.costOutput) / 2;
      const currentAvgCost = (current.costInput + current.costOutput) / 2;
      return currentAvgCost < cheapestAvgCost ? current : cheapest;
    });
  }

  /**
   * Get model statistics
   */
  async getModelStatistics() {
    const [total, byProvider, byTier] = await Promise.all([
      this.prisma.aIModel.count({ where: { enabled: true } }),
      this.prisma.aIModel.groupBy({
        by: ['provider'],
        where: { enabled: true },
        _count: true,
      }),
      this.prisma.aIModel.groupBy({
        by: ['tier'],
        where: { enabled: true },
        _count: true,
      }),
    ]);

    return {
      total,
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        count: p._count,
      })),
      byTier: byTier.map((t) => ({
        tier: t.tier,
        count: t._count,
      })),
    };
  }

  /**
   * Add custom model
   */
  async addModel(data: {
    provider: AIProvider;
    modelId: string;
    name: string;
    version?: string;
    maxTokens: number;
    supportsVision: boolean;
    supportsTools: boolean;
    costInput: number;
    costOutput: number;
    tier: ModelTier;
    qualityScore: number;
    speedScore: number;
    priority?: number;
  }): Promise<AIModel> {
    return this.prisma.aIModel.create({
      data: {
        ...data,
        enabled: true,
        priority: data.priority || 50,
      },
    });
  }

  /**
   * Update model
   */
  async updateModel(
    modelId: string,
    updates: Partial<AIModel>,
  ): Promise<AIModel> {
    return this.prisma.aIModel.update({
      where: { id: modelId },
      data: updates,
    });
  }

  /**
   * Disable model
   */
  async disableModel(modelId: string): Promise<AIModel> {
    return this.prisma.aIModel.update({
      where: { id: modelId },
      data: { enabled: false },
    });
  }
}
