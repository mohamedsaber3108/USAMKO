import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotFoundException } from '@nestjs/common';

describe('ReportService', () => {
  let service: ReportService;

  const mockPrisma = {
    campaign: {
      findUnique: jest.fn(),
    },
    campaignExecution: {
      findMany: jest.fn(),
    },
    platformAccount: {
      findMany: jest.fn(),
    },
    platformPost: {
      findMany: jest.fn(),
    },
    reportSchedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAnalyticsService = {
    getOverviewStats: jest.fn(),
    getPlatformStats: jest.fn(),
    getEngagementStats: jest.fn(),
    getTopPosts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCampaignReport', () => {
    it('should generate a campaign report', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp1',
        name: 'Test Campaign',
        status: 'ACTIVE',
        type: 'MARKETING',
        description: 'A test campaign',
        config: { budget: 1000 },
        scheduledAt: null,
        startedAt: new Date(),
        completedAt: null,
      });
      mockPrisma.campaignExecution.findMany.mockResolvedValue([
        { id: 'exec1', output: { engagement: 100, conversions: 10 }, workflow: {} },
      ]);
      mockPrisma.platformAccount.findMany.mockResolvedValue([]);
      mockPrisma.platformPost.findMany.mockResolvedValue([]);

      const result = await service.generateCampaignReport('tenant1', 'camp1');

      expect(result).toHaveProperty('campaign');
      expect(result.campaign.name).toBe('Test Campaign');
      expect(result).toHaveProperty('statistics');
      expect(result.statistics.totalPosts).toBe(1);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCampaignReport('tenant1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScheduledReports', () => {
    it('should return all scheduled reports for a tenant', async () => {
      const mockSchedules = [
        { id: 's1', name: 'Weekly Report', type: 'ENGAGEMENT', enabled: true },
        { id: 's2', name: 'Monthly Report', type: 'CAMPAIGN', enabled: false },
      ];
      mockPrisma.reportSchedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getScheduledReports('tenant1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('scheduleReport', () => {
    it('should create a scheduled report', async () => {
      const config = {
        name: 'Weekly Engagement',
        type: 'engagement' as const,
        frequency: 'weekly' as const,
        recipients: ['user@example.com'],
        format: 'pdf' as const,
        enabled: true,
      };

      mockPrisma.reportSchedule.create.mockResolvedValue({
        id: 'sched1',
        ...config,
        tenantId: 'tenant1',
      });

      const result = await service.scheduleReport('tenant1', config);

      expect(result).toBeDefined();
      expect(mockPrisma.reportSchedule.create).toHaveBeenCalled();
    });
  });

  describe('getGeneratedReports', () => {
    it('should return generated reports', async () => {
      mockPrisma.report.findMany.mockResolvedValue([
        { id: 'r1', name: 'Report 1', status: 'COMPLETED' },
      ]);

      const result = await service.getGeneratedReports('tenant1');

      expect(result).toHaveLength(1);
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete a scheduled report', async () => {
      mockPrisma.reportSchedule.delete.mockResolvedValue({ id: 's1' });

      await service.deleteScheduledReport('tenant1', 's1');

      expect(mockPrisma.reportSchedule.delete).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: 'tenant1' },
      });
    });
  });
});
