// Workflow service for managing workflows

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  Workflow,
  WorkflowStatus,
  ExecutionStatus,
  WorkflowDefinition,
  WorkflowExecution,
} from './workflow.model';
import { CreateWorkflowDto, ExecuteWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all workflows for a tenant
   */
  async getAllWorkflows(tenantId: string): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return workflows.map(w => ({
      id: w.id,
      tenantId: w.tenantId,
      userId: w.userId,
      name: w.name,
      description: w.description || undefined,
      definition: w.definition as unknown as WorkflowDefinition,
      status: w.status as WorkflowStatus,
      version: w.version,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) return null;

    return {
      id: workflow.id,
      tenantId: workflow.tenantId,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description || undefined,
      definition: workflow.definition as unknown as WorkflowDefinition,
      status: workflow.status as WorkflowStatus,
      version: workflow.version,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    tenantId: string,
    dto: CreateWorkflowDto
  ): Promise<Workflow> {
    // Check if workflow with same name already exists
    const existing = await this.prisma.workflow.findFirst({
      where: {
        tenantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Workflow with this name already exists');
    }

    const workflow = await this.prisma.workflow.create({
      data: {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId,
        name: dto.name,
        description: dto.description || null,
        definition: dto.definition as any,
        status: dto.status || WorkflowStatus.DRAFT,
        version: 1,
      },
    });

    return {
      id: workflow.id,
      tenantId: workflow.tenantId,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description || undefined,
      definition: workflow.definition as unknown as WorkflowDefinition,
      status: workflow.status as WorkflowStatus,
      version: workflow.version,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(id: string, dto: Partial<CreateWorkflowDto>): Promise<Workflow> {
    const workflow = await this.getWorkflowById(id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const updated = await this.prisma.workflow.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description || null,
        definition: dto.definition as any,
        status: dto.status,
        version: workflow.version + 1,
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      userId: updated.userId,
      name: updated.name,
      description: updated.description || undefined,
      definition: updated.definition as unknown as WorkflowDefinition,
      status: updated.status as WorkflowStatus,
      version: updated.version,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.getWorkflowById(id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.prisma.workflow.delete({
      where: { id },
    });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(id: string, dto?: ExecuteWorkflowDto): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflowById(id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new ForbiddenException('Workflow must be active to execute');
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: id,
        status: ExecutionStatus.RUNNING,
        input: dto?.input as any,
      },
    });

    try {
      // Execute workflow nodes
      const result = await this.executeNodes(workflow.definition, dto?.input);

      // Update execution as completed
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.COMPLETED,
          output: result as any,
          completedAt: new Date(),
        },
      });

      return {
        id: execution.id,
        workflowId: id,
        status: ExecutionStatus.COMPLETED,
        input: dto?.input,
        output: result,
        startedAt: execution.startedAt,
        completedAt: new Date(),
      };
    } catch (error: any) {
      // Update execution as failed
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute workflow nodes in topological order
   */
  private async executeNodes(
    definition: WorkflowDefinition,
    input?: Record<string, any>
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    const nodeResults: Record<string, any> = {};

    // Build dependency graph
    const dependencies = this.buildDependencyGraph(definition);

    // Execute nodes in topological order
    for (const nodeId of dependencies) {
      const node = definition.nodes.find(n => n.id === nodeId);

      if (!node) continue;

      nodeResults[nodeId] = await this.executeNode(node, input, nodeResults);
    }

    return nodeResults;
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: any,
    input?: Record<string, any>,
    nodeResults?: Record<string, any>
  ): Promise<any> {
    switch (node.type) {
      case 'trigger':
        return this.executeTriggerNode(node, input);

      case 'action':
        return this.executeActionNode(node, input, nodeResults);

      case 'delay':
        return this.executeDelayNode(node);

      case 'condition':
        return this.executeConditionNode(node, input, nodeResults);

      case 'loop':
        return this.executeLoopNode(node, input, nodeResults);

      case 'webhook':
        return this.executeWebhookNode(node, input);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Execute trigger node
   */
  private async executeTriggerNode(node: any, input?: Record<string, any>): Promise<any> {
    return { type: 'trigger', result: input || {} };
  }

  /**
   * Execute action node
   */
  private async executeActionNode(
    node: any,
    input?: Record<string, any>,
    nodeResults?: Record<string, any>
  ): Promise<any> {
    const { action, params } = node.config;

    // Resolve dynamic values from previous node results
    const resolvedParams = this.resolveDynamicValues(params, nodeResults);

    return { type: 'action', action, params: resolvedParams };
  }

  /**
   * Execute delay node
   */
  private async executeDelayNode(node: any): Promise<any> {
    const { duration } = node.config;
    await new Promise(resolve => setTimeout(resolve, duration));
    return { type: 'delay', duration };
  }

  /**
   * Execute condition node
   */
  private async executeConditionNode(
    node: any,
    input?: Record<string, any>,
    nodeResults?: Record<string, any>
  ): Promise<any> {
    const { condition } = node.config;
    const result = this.evaluateCondition(condition, input, nodeResults);
    return { type: 'condition', result };
  }

  /**
   * Execute loop node
   */
  private async executeLoopNode(
    node: any,
    input?: Record<string, any>,
    nodeResults?: Record<string, any>
  ): Promise<any> {
    const { iterations, body } = node.config;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      results.push({
        iteration: i,
        result: await this.executeNodes({ nodes: body, edges: [], variables: [] }, input),
      });
    }

    return { type: 'loop', iterations, results };
  }

  /**
   * Execute webhook node
   */
  private async executeWebhookNode(node: any, input?: Record<string, any>): Promise<any> {
    const { url, method, body } = node.config;
    const resolvedBody = this.resolveDynamicValues(body, undefined);

    // In production, this would make an actual HTTP request
    return {
      type: 'webhook',
      url,
      method,
      body: resolvedBody,
      response: { status: 200, message: 'Webhook executed' },
    };
  }

  /**
   * Build dependency graph for topological sort
   */
  private buildDependencyGraph(definition: WorkflowDefinition): string[] {
    const nodes = new Set<string>();
    const edges = new Map<string, string[]>();

    // Initialize all nodes
    for (const node of definition.nodes) {
      nodes.add(node.id);
      edges.set(node.id, []);
    }

    // Build edges
    for (const edge of definition.edges) {
      if (edges.has(edge.source)) {
        edges.get(edge.source)?.push(edge.target);
      }
    }

    // Topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const node of nodes) {
      inDegree.set(node, 0);
    }

    for (const [source, targets] of edges) {
      for (const target of targets) {
        inDegree.set(target, (inDegree.get(target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) queue.push(node);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node) {
        result.push(node);
        for (const target of edges.get(node) || []) {
          const degree = (inDegree.get(target) || 0) - 1;
          inDegree.set(target, degree);
          if (degree === 0) queue.push(target);
        }
      }
    }

    return result;
  }

  /**
   * Resolve dynamic values (e.g., ${nodeId.output})
   */
  private resolveDynamicValues(value: any, nodeResults?: Record<string, any>): any {
    if (typeof value === 'string' && value.includes('${')) {
      // Simple placeholder replacement
      return value.replace(/\$\{([^}]+)\}/g, (_, key) => {
        const parts = key.split('.');
        let result: any = nodeResults;
        for (const part of parts) {
          if (result && typeof result === 'object') {
            result = result[part];
          } else {
            return '';
          }
        }
        return result ?? '';
      });
    }

    if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.resolveDynamicValues(v, nodeResults);
      }
      return result;
    }

    return value;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    condition: any,
    input?: Record<string, any>,
    nodeResults?: Record<string, any>
  ): boolean {
    // Simple condition evaluation
    if (typeof condition === 'string') {
      return condition === 'true' || condition === '1' || condition === 'yes';
    }

    if (typeof condition === 'object') {
      // Support basic comparison operators
      if (condition.equals !== undefined) {
        return condition.equals === input?.[condition.field];
      }

      if (condition.greaterThan !== undefined) {
        return (input?.[condition.field] || 0) > condition.greaterThan;
      }

      if (condition.lessThan !== undefined) {
        return (input?.[condition.field] || 0) < condition.lessThan;
      }
    }

    return false;
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId: string): Promise<any[]> {
    return this.prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(id: string): Promise<any | null> {
    return this.prisma.workflowExecution.findUnique({
      where: { id },
    });
  }
}
