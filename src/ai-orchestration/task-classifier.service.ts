import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskComplexity, ModelTier } from '@prisma/client';

export interface TaskClassification {
  complexity: TaskComplexity;
  recommendedTier: ModelTier;
  minQuality: number;
  maxLatencyMs?: number;
  reasoning: string;
}

@Injectable()
export class TaskClassifierService {
  private readonly logger = new Logger(TaskClassifierService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Classify task complexity based on multiple factors
   */
  async classifyTask(params: {
    taskName?: string;
    prompt: string;
    context?: Record<string, any>;
    minQuality?: number;
    maxLatency?: number;
  }): Promise<TaskClassification> {
    // Check if we have a predefined template
    if (params.taskName) {
      const template = await this.getTaskTemplate(params.taskName);
      if (template) {
        return {
          complexity: template.complexity,
          recommendedTier: this.getTierFromComplexity(template.complexity),
          minQuality: template.qualityMin,
          maxLatencyMs: template.maxLatencyMs || undefined,
          reasoning: `Predefined template: ${template.description}`,
        };
      }
    }

    // Heuristic-based classification
    const complexity = this.analyzePromptComplexity(params.prompt, params.context);

    return {
      complexity,
      recommendedTier: this.getTierFromComplexity(complexity),
      minQuality: params.minQuality || this.getDefaultMinQuality(complexity),
      maxLatencyMs: params.maxLatency,
      reasoning: this.getClassificationReasoning(complexity, params.prompt),
    };
  }

  /**
   * Analyze prompt to determine complexity
   */
  private analyzePromptComplexity(
    prompt: string,
    context?: Record<string, any>,
  ): TaskComplexity {
    const tokens = prompt.split(/\s+/).length;
    const promptLower = prompt.toLowerCase();

    // Check for critical/high-stakes keywords
    const criticalKeywords = [
      'legal', 'contract', 'compliance', 'security', 'financial',
      'medical', 'critical', 'production', 'mission-critical',
    ];

    const complexKeywords = [
      'analyze', 'compare', 'evaluate', 'synthesize', 'design',
      'multi-step', 'research', 'comprehensive', 'detailed',
      'optimize', 'architect', 'strategy',
    ];

    const moderateKeywords = [
      'generate', 'create', 'write', 'explain', 'describe',
      'summarize', 'review', 'check',
    ];

    const simpleKeywords = [
      'format', 'extract', 'list', 'translate', 'convert',
      'find', 'get', 'fetch',
    ];

    // Critical: High-stakes or sensitive content
    if (criticalKeywords.some(k => promptLower.includes(k))) {
      return TaskComplexity.CRITICAL;
    }

    // Very long prompts = complex
    if (tokens > 1000) {
      return TaskComplexity.COMPLEX;
    }

    // Check context complexity
    if (context) {
      const contextSize = JSON.stringify(context).length;
      if (contextSize > 10000) {
        return TaskComplexity.COMPLEX;
      }
    }

    // Count keyword matches
    const complexCount = complexKeywords.filter(k => promptLower.includes(k)).length;
    const moderateCount = moderateKeywords.filter(k => promptLower.includes(k)).length;
    const simpleCount = simpleKeywords.filter(k => promptLower.includes(k)).length;

    // Multiple complex keywords
    if (complexCount >= 2) {
      return TaskComplexity.COMPLEX;
    }

    // Single complex keyword
    if (complexCount >= 1) {
      return TaskComplexity.MODERATE;
    }

    // Multiple moderate keywords
    if (moderateCount >= 2) {
      return TaskComplexity.MODERATE;
    }

    // Simple keywords or short prompt
    if (simpleCount >= 2 || tokens < 50) {
      return TaskComplexity.SIMPLE;
    }

    // Very short = trivial
    if (tokens < 20) {
      return TaskComplexity.TRIVIAL;
    }

    // Default to moderate
    return TaskComplexity.MODERATE;
  }

  /**
   * Map complexity to model tier
   */
  private getTierFromComplexity(complexity: TaskComplexity): ModelTier {
    const mapping = {
      [TaskComplexity.TRIVIAL]: ModelTier.NANO,
      [TaskComplexity.SIMPLE]: ModelTier.SMALL,
      [TaskComplexity.MODERATE]: ModelTier.MEDIUM,
      [TaskComplexity.COMPLEX]: ModelTier.LARGE,
      [TaskComplexity.CRITICAL]: ModelTier.PREMIUM,
    };

    return mapping[complexity];
  }

  /**
   * Get default minimum quality for complexity
   */
  private getDefaultMinQuality(complexity: TaskComplexity): number {
    const qualityMap = {
      [TaskComplexity.TRIVIAL]: 0.6,
      [TaskComplexity.SIMPLE]: 0.7,
      [TaskComplexity.MODERATE]: 0.75,
      [TaskComplexity.COMPLEX]: 0.85,
      [TaskComplexity.CRITICAL]: 0.95,
    };

    return qualityMap[complexity];
  }

  /**
   * Get classification reasoning
   */
  private getClassificationReasoning(
    complexity: TaskComplexity,
    prompt: string,
  ): string {
    const tokens = prompt.split(/\s+/).length;

    switch (complexity) {
      case TaskComplexity.CRITICAL:
        return 'High-stakes or sensitive content detected, requires highest quality model';
      case TaskComplexity.COMPLEX:
        return `Complex task with ${tokens} tokens, requires advanced reasoning`;
      case TaskComplexity.MODERATE:
        return `Standard complexity task, balanced model recommended`;
      case TaskComplexity.SIMPLE:
        return `Simple task, cost-effective model sufficient`;
      case TaskComplexity.TRIVIAL:
        return `Trivial task (${tokens} tokens), cheapest model appropriate`;
      default:
        return 'Standard classification';
    }
  }

  /**
   * Get task template if exists
   */
  private async getTaskTemplate(taskName: string) {
    return this.prisma.taskTemplate.findUnique({
      where: { name: taskName },
    });
  }

  /**
   * Create task template
   */
  async createTaskTemplate(data: {
    name: string;
    category: string;
    description: string;
    complexity: TaskComplexity;
    qualityMin: number;
    maxLatencyMs?: number;
    recommendedModels?: string[];
  }) {
    return this.prisma.taskTemplate.create({
      data: {
        ...data,
        recommendedModels: data.recommendedModels || [],
      },
    });
  }

  /**
   * Get all task templates
   */
  async getAllTemplates() {
    return this.prisma.taskTemplate.findMany({
      orderBy: { category: 'asc' },
    });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string) {
    return this.prisma.taskTemplate.findMany({
      where: { category },
    });
  }

  /**
   * Initialize default task templates
   */
  async initializeDefaultTemplates() {
    const templates = [
      {
        name: 'generate_message',
        category: 'campaigns',
        description: 'Generate personalized campaign message',
        complexity: TaskComplexity.MODERATE,
        qualityMin: 0.8,
        maxLatencyMs: 5000,
      },
      {
        name: 'analyze_sentiment',
        category: 'analytics',
        description: 'Analyze sentiment of text',
        complexity: TaskComplexity.SIMPLE,
        qualityMin: 0.7,
        maxLatencyMs: 3000,
      },
      {
        name: 'enrich_lead',
        category: 'leads',
        description: 'Enrich lead data from sources',
        complexity: TaskComplexity.MODERATE,
        qualityMin: 0.75,
      },
      {
        name: 'plan_data_query',
        category: 'data_orchestration',
        description: 'Plan multi-source data collection',
        complexity: TaskComplexity.COMPLEX,
        qualityMin: 0.85,
      },
      {
        name: 'extract_structured_data',
        category: 'data',
        description: 'Extract structured data from text',
        complexity: TaskComplexity.SIMPLE,
        qualityMin: 0.75,
      },
    ];

    for (const template of templates) {
      await this.prisma.taskTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
    }

    this.logger.log(`Initialized ${templates.length} task templates`);
  }
}
