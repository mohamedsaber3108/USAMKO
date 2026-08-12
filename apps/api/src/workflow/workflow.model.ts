// Workflow models

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export interface Workflow {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay' | 'webhook';
  config: Record<string, any>;
  position?: { x: number; y: number };
  onError?: 'stop' | 'continue' | 'retry';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description?: string;
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  nextRunAt: Date;
  lastRunAt?: Date;
  createdAt: Date;
}
