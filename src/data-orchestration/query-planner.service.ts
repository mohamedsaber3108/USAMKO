import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { SourceRegistryService } from './source-registry.service';
import { DataSource } from '@prisma/client';

export interface DataWorkflowPlan {
  target: 'people' | 'companies' | 'locations';
  criteria: Record<string, any>;
  steps: WorkflowStep[];
  estimatedTotalResults: number;
  estimatedTotalCost: number;
  estimatedDuration: string;
  originalQuery?: string;
}

export interface WorkflowStep {
  stepNumber: number;
  name: string;
  description: string;
  sourceSlug: string;
  operation: 'discover' | 'collect' | 'extract' | 'enrich';
  parameters: Record<string, any>;
  dependsOn: number[];
  estimatedResults: number;
  estimatedCost: number;
}

@Injectable()
export class QueryPlannerService {
  private readonly logger = new Logger(QueryPlannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestration: AIOrchestrationService,
    private readonly sourceRegistry: SourceRegistryService,
  ) {}

  /**
   * Convert natural language query into execution plan using AI
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
  }): Promise<DataWorkflowPlan> {
    this.logger.log(`Planning query: "${params.query}"`);

    // Get available data sources
    const sources = await this.sourceRegistry.getAllSources();

    // Filter by preferences
    let filteredSources = sources;
    if (params.preferences?.preferFree) {
      filteredSources = sources.filter((s) => s.costPerQuery === 0);
    }
    if (params.preferences?.minQuality) {
      filteredSources = filteredSources.filter(
        (s) => s.quality >= params.preferences.minQuality,
      );
    }

    // Build planning prompt
    const prompt = this.buildPlanningPrompt(params.query, filteredSources);

    // Get plan from AI
    const response = await this.aiOrchestration.execute({
      tenantId: params.tenantId,
      userId: params.userId,
      taskName: 'plan_data_query',
      prompt,
      minQuality: 0.85, // High quality required for planning
    });

    // Parse plan
    const plan = this.parsePlan(response.response);
    plan.originalQuery = params.query;

    // Validate plan
    await this.validatePlan(plan, sources);

    this.logger.log(
      `Plan created: ${plan.steps.length} steps, est. ${plan.estimatedTotalResults} results, $${plan.estimatedTotalCost}`,
    );

    return plan;
  }

  /**
   * Build prompt for AI planner
   */
  private buildPlanningPrompt(
    query: string,
    sources: DataSource[],
  ): string {
    const sourceList = sources
      .map(
        (s) =>
          `- ${s.name} (${s.slug}): ${s.capabilities.join(', ')} | Cost: $${s.costPerQuery} | Quality: ${s.quality}`,
      )
      .join('\n');

    return `You are a data orchestration planner. Convert the user's natural language query into a step-by-step execution plan.

Available Data Sources:
${sourceList}

User Query: "${query}"

Generate a JSON plan with these steps:
1. Parse the query to identify: target (people/companies/locations), criteria (filters), required fields
2. Select the best data sources (prefer free sources, high quality)
3. Create step-by-step plan with dependencies
4. Estimate total cost and time

Return ONLY valid JSON in this format:
{
  "target": "people" | "companies" | "locations",
  "criteria": {
    "title": "CTO",
    "location": "San Francisco",
    "industry": "Technology"
  },
  "steps": [
    {
      "stepNumber": 1,
      "name": "Search LinkedIn",
      "description": "Find CTOs in SF tech companies",
      "sourceSlug": "linkedin",
      "operation": "discover",
      "parameters": {
        "query": "CTO",
        "filters": { "location": "San Francisco", "industry": "Technology" }
      },
      "dependsOn": [],
      "estimatedResults": 100,
      "estimatedCost": 0
    },
    {
      "stepNumber": 2,
      "name": "Enrich with emails",
      "description": "Find email addresses",
      "sourceSlug": "linkout",
      "operation": "enrich",
      "parameters": { "fields": ["email"] },
      "dependsOn": [1],
      "estimatedResults": 80,
      "estimatedCost": 0
    }
  ],
  "estimatedTotalResults": 80,
  "estimatedTotalCost": 0,
  "estimatedDuration": "2-3 minutes"
}`;
  }

  /**
   * Parse AI response into plan
   */
  private parsePlan(response: string): DataWorkflowPlan {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const json = jsonMatch ? jsonMatch[1] : response;

    try {
      const plan = JSON.parse(json);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to parse plan: ${error.message}`);
      this.logger.debug(`Response was: ${response}`);
      throw new Error('Failed to parse plan from AI response');
    }
  }

  /**
   * Validate plan is executable
   */
  private async validatePlan(
    plan: DataWorkflowPlan,
    sources: DataSource[],
  ): Promise<void> {
    if (!plan.steps || plan.steps.length === 0) {
      throw new Error('Plan must have at least one step');
    }

    for (const step of plan.steps) {
      // Check source exists
      const source = sources.find((s) => s.slug === step.sourceSlug);
      if (!source) {
        throw new Error(`Unknown source: ${step.sourceSlug}`);
      }

      // Check source has capability
      if (!source.capabilities.includes(step.operation)) {
        throw new Error(
          `Source ${step.sourceSlug} doesn't support ${step.operation}`,
        );
      }

      // Check dependencies are valid
      for (const dep of step.dependsOn) {
        if (dep >= step.stepNumber) {
          throw new Error(
            `Invalid dependency: step ${step.stepNumber} depends on future step ${dep}`,
          );
        }
        const depStep = plan.steps.find((s) => s.stepNumber === dep);
        if (!depStep) {
          throw new Error(
            `Invalid dependency: step ${step.stepNumber} depends on non-existent step ${dep}`,
          );
        }
      }
    }

    this.logger.log('Plan validation passed');
  }

  /**
   * Optimize plan (simplify, reduce cost, improve quality)
   */
  async optimizePlan(plan: DataWorkflowPlan): Promise<DataWorkflowPlan> {
    // Remove duplicate steps
    const uniqueSteps = this.deduplicateSteps(plan.steps);

    // Reorder for better parallelization
    const reordered = this.reorderSteps(uniqueSteps);

    // Update estimates
    const optimized = {
      ...plan,
      steps: reordered,
      estimatedTotalCost: reordered.reduce(
        (sum, s) => sum + s.estimatedCost,
        0,
      ),
    };

    this.logger.log(
      `Plan optimized: ${plan.steps.length} → ${optimized.steps.length} steps`,
    );

    return optimized;
  }

  /**
   * Remove duplicate steps
   */
  private deduplicateSteps(steps: WorkflowStep[]): WorkflowStep[] {
    const seen = new Map<string, WorkflowStep>();

    for (const step of steps) {
      const key = `${step.sourceSlug}:${step.operation}:${JSON.stringify(step.parameters)}`;
      if (!seen.has(key)) {
        seen.set(key, step);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Reorder steps for better execution
   */
  private reorderSteps(steps: WorkflowStep[]): WorkflowStep[] {
    // Topological sort respecting dependencies
    const sorted: WorkflowStep[] = [];
    const remaining = [...steps];

    while (remaining.length > 0) {
      const next = remaining.find((step) =>
        step.dependsOn.every((dep) =>
          sorted.some((s) => s.stepNumber === dep),
        ),
      );

      if (!next) {
        // Circular dependency or invalid
        break;
      }

      sorted.push(next);
      remaining.splice(remaining.indexOf(next), 1);
    }

    // Renumber steps
    return sorted.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));
  }

  /**
   * Get plan statistics
   */
  async getPlanStatistics(tenantId: string) {
    const workflows = await this.prisma.dataWorkflow.findMany({
      where: { tenantId },
      select: {
        status: true,
        recordCount: true,
        createdAt: true,
        completedAt: true,
      },
    });

    const completed = workflows.filter((w) => w.status === 'COMPLETED');
    const avgRecords =
      completed.length > 0
        ? completed.reduce((sum, w) => sum + (w.recordCount || 0), 0) /
          completed.length
        : 0;

    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, w) => {
            if (w.completedAt && w.createdAt) {
              return (
                sum + (w.completedAt.getTime() - w.createdAt.getTime())
              );
            }
            return sum;
          }, 0) /
          completed.length /
          1000
        : 0;

    return {
      totalWorkflows: workflows.length,
      completedWorkflows: completed.length,
      averageRecords: Math.round(avgRecords),
      averageDurationSeconds: Math.round(avgDuration),
    };
  }
}
