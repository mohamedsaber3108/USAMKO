// Workflow DTOs

import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { WorkflowStatus } from '../workflow.model';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  definition: WorkflowDefinition;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;
}

export class UpdateWorkflowDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  definition?: WorkflowDefinition;

  @IsEnum(WorkflowStatus)
  @IsOptional()
  status?: WorkflowStatus;
}

export class ExecuteWorkflowDto {
  @IsObject()
  @IsOptional()
  input?: Record<string, any>;
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
