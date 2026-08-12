import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    platformAccount: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    workflowExecution: {
      count: jest.fn(),
    },
    campaign: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    workflow: {
      count: jest.fn(),
    },
    platformPost: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    campaignExecution: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverviewStats', () => {
    it('should return overview statistics for a tenant', async () => {
      mockPrisma.platformAccount.count.mockResolvedValue(5);
      mockPrisma.workflowExecution.count.mockResolvedValue(10);
      mockPrisma.campaign.count.mockResolvedValue(3);
      mockPrisma.workflow.count.mockResolvedValue(2);

      const result = await service.getOverviewStats('tenant1');

      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('totalEngagement');
      expect(result).toHaveProperty('totalCampaigns');
      expect(result).toHaveProperty('activeWorkflows');
      expect(result).toHaveProperty('platformCount');
    });

    it('should apply date range filter when provided', async () => {
      mockPrisma.platformAccount.count.mockResolvedValue(2);
      mockPrisma.workflowExecution.count.mockResolvedValue(5);
      mockPrisma.campaign.count.mockResolvedValue(1);
      mockPrisma.workflow.count.mockResolvedValue(1);

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await service.getOverviewStats('tenant1', dateRange);

      expect(result).toBeDefined();
      expect(mockPrisma.workflowExecution.count).toHaveBeenCalled();
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform statistics', async () => {
      mockPrisma.platformAccount.findMany.mockResolvedValue([
        { id: 'acc1', platform: 'INSTAGRAM', accountName: 'test', createdAt: new Date() },
      ]);
      mockPrisma.platformPost.count.mockResolvedValue(10);

      const result = await service.getPlatformStats('tenant1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('platform', 'INSTAGRAM');
      expect(result[0]).toHaveProperty('posts', 10);
    });

    it('should filter by platform when specified', async () => {
      mockPrisma.platformAccount.findMany.mockResolvedValue([]);

      const result = await service.getPlatformStats('tenant1', 'TWITTER');

      expect(result).toHaveLength(0);
      expect(mockPrisma.platformAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'TWITTER' }),
        }),
      );
    });
  });

  describe('getContentPerformance', () => {
    it('should return content performance grouped by platform', async () => {
      mockPrisma.platformPost.findMany.mockResolvedValue([
        { id: 'p1', content: 'Hello', platformAccount: { platform: 'INSTAGRAM' } },
        { id: 'p2', content: 'World', platformAccount: { platform: 'INSTAGRAM' } },
        { id: 'p3', content: 'Test', platformAccount: { platform: 'TWITTER' } },
      ]);

      const result = await service.getContentPerformance('tenant1');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toHaveProperty('contentType');
      expect(result[0]).toHaveProperty('posts');
      expect(result[0]).toHaveProperty('engagement');
      expect(result[0]).toHaveProperty('avgEngagementRate');
    });

    it('should return empty array when no posts exist', async () => {
      mockPrisma.platformPost.findMany.mockResolvedValue([]);

      const result = await service.getContentPerformance('tenant1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getEngagementStats', () => {
    it('should return engagement statistics based on posts', async () => {
      mockPrisma.platformPost.findMany.mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ]);

      const result = await service.getEngagementStats('tenant1');

      expect(result).toHaveProperty('likes', 20);
      expect(result).toHaveProperty('comments', 10);
      expect(result).toHaveProperty('shares', 4);
      expect(result).toHaveProperty('saves', 2);
      expect(result).toHaveProperty('clicks', 30);
    });
  });
});
