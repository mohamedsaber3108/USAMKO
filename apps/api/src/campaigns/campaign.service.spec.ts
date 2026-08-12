import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../prisma.service';
import { getQueueToken } from '@nestjs/bull';

describe('CampaignService', () => {
  let service: CampaignService;

  const mockPrisma = {
    campaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    campaignExecution: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('campaigns'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return campaigns for tenant', async () => {
      const campaigns = [{ id: '1', name: 'Test Campaign' }];
      mockPrisma.campaign.findMany.mockResolvedValue(campaigns);
      const result = await service.findAll('tenant1');
      expect(result).toEqual(campaigns);
    });
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const dto = { name: 'New Campaign', type: 'POST', config: {} };
      const created = { id: '1', ...dto, status: 'DRAFT' };
      mockPrisma.campaign.create.mockResolvedValue(created);
      const result = await service.create('user1', 'tenant1', dto as any);
      expect(result.name).toBe('New Campaign');
    });
  });

  describe('start', () => {
    it('should start a campaign and add to queue', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue({ id: '1', status: 'DRAFT', config: {} });
      mockPrisma.campaign.update.mockResolvedValue({ id: '1', status: 'RUNNING' });
      mockQueue.add.mockResolvedValue({ id: 'job1' });
      await service.start('1', 'tenant1');
      expect(mockQueue.add).toHaveBeenCalledWith('execute-campaign', expect.any(Object), expect.any(Object));
    });
  });
});
