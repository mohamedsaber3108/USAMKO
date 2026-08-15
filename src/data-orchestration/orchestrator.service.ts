import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SourceRegistryService } from './source-registry.service';
import { NormalizerService } from './normalizer.service';
import { ValidatorService } from './validator.service';
import { EnricherService } from './enricher.service';
import { CacheService } from './cache.service';
import { DataWorkflowPlan, WorkflowStep } from './query-planner.service';
import { QueryStatus } from '@prisma/client';

export interface UnifiedRecord {
  id: string;
  type: 'person' | 'company' | 'location';
  source: string;
  sourceId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  companyName?: string;
  companyDomain?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  coordinates?: { lat: number; lng: number };
  confidence: number;
  lastUpdated: Date;
  raw?: any;
}

export interface DataSourceResult {
  records: UnifiedRecord[];
  totalCount: number;
  cost: number;
  latencyMs: number;
}

export interface DataWorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'partial';
  records: UnifiedRecord[];
  totalCount: number;
  stepsCompleted: number;
  stepsTotal: number;
  totalCost: number;
  totalLatencyMs: number;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sourceRegistry: SourceRegistryService,
    private readonly normalizer: NormalizerService,
    private readonly validator: ValidatorService,
    private readonly enricher: EnricherService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Execute data workflow
   */
  async executeWorkflow(
    tenantId: string,
    userId: string,
    plan: DataWorkflowPlan,
  ): Promise<DataWorkflowResult> {
    this.logger.log(
      `Executing workflow: ${plan.steps.length} steps for tenant ${tenantId}`,
    );

    // Create workflow record
    const workflow = await this.prisma.dataWorkflow.create({
      data: {
        tenantId,
        userId,
        name: plan.steps[0]?.name || 'Data Collection',
        naturalLanguage: plan.originalQuery || '',
        plan: plan as any,
        status: QueryStatus.RUNNING,
        currentStep: 0,
      },
    });

    const results: UnifiedRecord[] = [];
    const stepResults = new Map<number, UnifiedRecord[]>();
    let stepsCompleted = 0;
    let totalCost = 0;
    let totalLatencyMs = 0;

    try {
      // Execute steps in order (respecting dependencies)
      for (const step of plan.steps) {
        this.logger.log(
          `Executing step ${step.stepNumber}: ${step.name}`,
        );

        // Wait for dependencies
        await this.waitForDependencies(step, stepResults);

        // Get input from dependencies
        const input = this.collectDependencyInput(step, stepResults);

        // Execute step
        const stepResult = await this.executeStep({
          tenantId,
          userId,
          workflowId: workflow.id,
          step,
          input,
        });

        // Store results
        stepResults.set(step.stepNumber, stepResult.records);
        results.push(...stepResult.records);
        stepsCompleted++;
        totalCost += stepResult.cost;
        totalLatencyMs += stepResult.latencyMs;

        // Update progress
        await this.prisma.dataWorkflow.update({
          where: { id: workflow.id },
          data: { currentStep: step.stepNumber },
        });

        this.logger.log(
          `Step ${step.stepNumber} completed: ${stepResult.records.length} records, $${stepResult.cost.toFixed(4)}, ${stepResult.latencyMs}ms`,
        );
      }

      // Normalize all results
      const normalized = await this.normalizer.normalize(results);
      this.logger.log(`Normalized ${normalized.length} records`);

      // Validate
      const validated = await this.validator.validateBatch(normalized);
      this.logger.log(`Validated ${validated.length} records`);

      // Enrich
      const enriched = await this.enricher.enrichBatch(validated);
      this.logger.log(`Enriched ${enriched.length} records`);

      // Mark complete
      await this.prisma.dataWorkflow.update({
        where: { id: workflow.id },
        data: {
          status: QueryStatus.COMPLETED,
          finalResults: enriched as any,
          recordCount: enriched.length,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Workflow ${workflow.id} completed: ${enriched.length} records, $${totalCost.toFixed(4)}, ${totalLatencyMs}ms`,
      );

      return {
        workflowId: workflow.id,
        status: 'completed',
        records: enriched,
        totalCount: enriched.length,
        stepsCompleted,
        stepsTotal: plan.steps.length,
        totalCost,
        totalLatencyMs,
      };
    } catch (error) {
      this.logger.error(`Workflow ${workflow.id} failed:`, error);

      // Mark failed
      await this.prisma.dataWorkflow.update({
        where: { id: workflow.id },
        data: {
          status: QueryStatus.FAILED,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute single step
   */
  private async executeStep(params: {
    tenantId: string;
    userId: string;
    workflowId: string;
    step: WorkflowStep;
    input?: UnifiedRecord[];
  }): Promise<DataSourceResult> {
    const { step, input } = params;

    // Check cache
    const cacheKey = {
      sourceSlug: step.sourceSlug,
      operation: step.operation,
      parameters: step.parameters,
    };

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for step ${step.stepNumber}`);
      return cached;
    }

    // Get source
    const source = await this.sourceRegistry.getSource(step.sourceSlug);
    if (!source) {
      throw new Error(`Source not found: ${step.sourceSlug}`);
    }

    // Execute operation based on type
    const startTime = Date.now();
    let result: DataSourceResult;

    try {
      switch (step.operation) {
        case 'discover':
          result = await source.discover(step.parameters);
          break;

        case 'collect':
          result = await source.collect(step.parameters);
          break;

        case 'extract':
          result = await source.extract(step.parameters);
          break;

        case 'enrich':
          // Enrich input records
          if (!input || input.length === 0) {
            result = {
              records: [],
              totalCount: 0,
              cost: 0,
              latencyMs: 0,
            };
          } else {
            const enriched = await source.enrichBatch(input);
            result = {
              records: enriched,
              totalCount: enriched.length,
              cost: source.estimateCost('enrich', {
                count: input.length,
              }),
              latencyMs: Date.now() - startTime,
            };
          }
          break;

        default:
          throw new Error(`Unknown operation: ${step.operation}`);
      }
    } catch (error) {
      this.logger.error(
        `Step ${step.stepNumber} execution failed: ${error.message}`,
      );
      throw error;
    }

    // Cache result
    await this.cache.set({
      key: cacheKey,
      result,
      ttl: 3600, // 1 hour
    });

    // Track query
    await this.prisma.dataQuery.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        workflowId: params.workflowId,
        naturalLanguage: `${step.name}: ${step.description}`,
        parsedQuery: step.parameters as any,
        sourceId: source.id,
        operation: step.operation,
        parameters: step.parameters as any,
        status: QueryStatus.COMPLETED,
        resultCount: result.totalCount,
        results: result.records as any,
        completedAt: new Date(),
        latencyMs: result.latencyMs,
        cost: result.cost,
      },
    });

    return result;
  }

  /**
   * Wait for step dependencies to complete
   */
  private async waitForDependencies(
    step: WorkflowStep,
    stepResults: Map<number, UnifiedRecord[]>,
  ): Promise<void> {
    for (const dep of step.dependsOn) {
      // In this synchronous implementation, dependencies are already complete
      // In async implementation, would poll/wait here
      if (!stepResults.has(dep)) {
        throw new Error(
          `Dependency step ${dep} not completed before step ${step.stepNumber}`,
        );
      }
    }
  }

  /**
   * Collect input from dependency steps
   */
  private collectDependencyInput(
    step: WorkflowStep,
    stepResults: Map<number, UnifiedRecord[]>,
  ): UnifiedRecord[] {
    if (step.dependsOn.length === 0) {
      return [];
    }

    // Merge results from all dependencies
    const input: UnifiedRecord[] = [];
    for (const dep of step.dependsOn) {
      const depResults = stepResults.get(dep) || [];
      input.push(...depResults);
    }

    return input;
  }

  /**
   * Cancel running workflow
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    await this.prisma.dataWorkflow.update({
      where: { id: workflowId },
      data: {
        status: QueryStatus.FAILED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Workflow ${workflowId} cancelled`);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string) {
    const workflow = await this.prisma.dataWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const plan = workflow.plan as any;
    const progress =
      plan?.steps?.length > 0
        ? (workflow.currentStep / plan.steps.length) * 100
        : 0;

    return {
      id: workflow.id,
      status: workflow.status,
      name: workflow.name,
      naturalLanguage: workflow.naturalLanguage,
      currentStep: workflow.currentStep,
      totalSteps: plan?.steps?.length || 0,
      progress: Math.round(progress),
      recordCount: workflow.recordCount,
      createdAt: workflow.createdAt,
      completedAt: workflow.completedAt,
      user: workflow.user,
    };
  }
}
