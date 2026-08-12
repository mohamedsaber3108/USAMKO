// Workflow controller for managing workflows

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Auth } from '../common/decorators/auth.decorator';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
} from './dto/create-workflow.dto';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * Get all workflows for current tenant
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getAllWorkflows(@Auth() user: any) {
    return this.workflowService.getAllWorkflows(user.tenantId);
  }

  /**
   * Get workflow by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getWorkflow(@Param('id') id: string) {
    return this.workflowService.getWorkflowById(id);
  }

  /**
   * Create a new workflow
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async createWorkflow(@Body() dto: CreateWorkflowDto, @Auth() user: any) {
    return this.workflowService.createWorkflow(user.id, user.tenantId, dto);
  }

  /**
   * Update a workflow
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.updateWorkflow(id, dto);
  }

  /**
   * Delete a workflow
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async deleteWorkflow(@Param('id') id: string) {
    await this.workflowService.deleteWorkflow(id);
  }

  /**
   * Execute a workflow
   */
  @Post(':id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async executeWorkflow(@Param('id') id: string, @Body() dto?: ExecuteWorkflowDto) {
    return this.workflowService.executeWorkflow(id, dto);
  }

  /**
   * Get workflow executions
   */
  @Get(':id/executions')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getExecutions(@Param('id') id: string) {
    return this.workflowService.getWorkflowExecutions(id);
  }

  /**
   * Get execution by ID
   */
  @Get('executions/:id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getExecution(@Param('id') id: string) {
    return this.workflowService.getExecutionById(id);
  }
}
