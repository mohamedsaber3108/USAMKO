import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma.service';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('WorkflowService', () => {
  let service: WorkflowService;

  const mockPrisma = {
    workflow: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workflowExecution: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockWorkflow = {
    id: 'wf1',
    tenantId: 'tenant1',
    userId: 'user1',
    name: 'Test Workflow',
    description: 'A test workflow',
    definition: { nodes: [], edges: [] },
    status: 'ACTIVE',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllWorkflows', () => {
    it('should return all workflows for a tenant', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([mockWorkflow]);

      const result = await service.getAllWorkflows('tenant1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Workflow');
      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getWorkflowById', () => {
    it('should return workflow when found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await service.getWorkflowById('wf1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('wf1');
    });

    it('should return null when not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const result = await service.getWorkflowById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(null);
      mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

      const dto = {
        name: 'Test Workflow',
        description: 'A test workflow',
        definition: { nodes: [], edges: [] },
      };

      const result = await service.createWorkflow('user1', 'tenant1', dto as any);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Workflow');
      expect(mockPrisma.workflow.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when name already exists', async () => {
      mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);

      const dto = { name: 'Test Workflow', definition: { nodes: [], edges: [] } };

      await expect(
        service.createWorkflow('user1', 'tenant1', dto as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateWorkflow', () => {
    it('should update a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflow.update.mockResolvedValue({
        ...mockWorkflow,
        name: 'Updated Workflow',
        version: 2,
      });

      const result = await service.updateWorkflow('wf1', { name: 'Updated Workflow' });

      expect(result.name).toBe('Updated Workflow');
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWorkflow('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflow.delete.mockResolvedValue(mockWorkflow);

      await service.deleteWorkflow('wf1');

      expect(mockPrisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 'wf1' },
      });
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.deleteWorkflow('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('executeWorkflow', () => {
    it('should execute an active workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowExecution.create.mockResolvedValue({
        id: 'exec1',
        workflowId: 'wf1',
        status: 'RUNNING',
        startedAt: new Date(),
      });
      mockPrisma.workflowExecution.update.mockResolvedValue({
        id: 'exec1',
        status: 'COMPLETED',
      });

      const result = await service.executeWorkflow('wf1');

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw ForbiddenException for non-active workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        ...mockWorkflow,
        status: 'DRAFT',
      });

      await expect(service.executeWorkflow('wf1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.executeWorkflow('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
