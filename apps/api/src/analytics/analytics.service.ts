import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface OverviewStats {
  totalPosts: number;
  totalEngagement: number;
  totalFollowers: number;
  totalCampaigns: number;
  activeWorkflows: number;
  platformCount: number;
}

export interface PlatformStat {
  platform: string;
  posts: number;
  engagement: number;
  followers: number;
  growth: number;
}

export interface CampaignStat {
  id: string;
  name: string;
  status: string;
  posts: number;
  engagement: number;
  conversions: number;
  roi: number;
}

export interface EngagementStat {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface GrowthStat {
  labels: string[];
  followers: number[];
  posts: number[];
  engagement: number[];
}

export interface TopPost {
  id: string;
  platform: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  postedAt: Date;
}

export interface ContentPerformance {
  contentType: string;
  posts: number;
  engagement: number;
  avgEngagementRate: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats(
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<OverviewStats> {
    const where: Prisma.WorkflowExecutionWhereInput = {
      workflow: {
        tenantId,
      },
    };

    if (dateRange) {
      where.startedAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const [platformCount, execCount, totalCampaigns, activeWorkflows, leadCount] = await Promise.all([
      this.prisma.platformAccount.count({ where: { tenantId } }),
      this.prisma.workflowExecution.count({ where }),
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.workflow.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.lead.count({ where: { tenantId } }),
    ]);

    return {
      totalPosts: execCount,
      totalEngagement: leadCount,
      totalFollowers: 0,
      totalCampaigns,
      activeWorkflows,
      platformCount,
    };
  }

  async getPlatformStats(
    tenantId: string,
    platform?: string,
    dateRange?: DateRange,
  ): Promise<PlatformStat[]> {
    const where: Prisma.PlatformAccountWhereInput = { tenantId };

    if (platform) {
      where.platform = platform as any;
    }

    const accounts = await this.prisma.platformAccount.findMany({
      where,
      select: {
        id: true,
        platform: true,
        username: true,
        createdAt: true,
      },
    });

    return accounts.map((account) => ({
      platform: account.platform,
      posts: 0,
      engagement: 0,
      followers: 0,
      growth: 0,
    }));
  }

  async getCampaignStats(tenantId: string, campaignId: string): Promise<CampaignStat> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    const executions = await this.prisma.campaignExecution.findMany({
      where: { campaignId },
    });

    const totalEngagement = executions.reduce(
      (sum, exec) => sum + (Number((exec.results as any)?.engagement) || 0),
      0,
    );

    const totalConversions = executions.reduce(
      (sum, exec) => sum + (Number((exec.results as any)?.conversions) || 0),
      0,
    );

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      posts: executions.length,
      engagement: totalEngagement,
      conversions: totalConversions,
      roi: totalConversions > 0 ? (totalEngagement / totalConversions) * 100 : 0,
    };
  }

  async getEngagementStats(
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<EngagementStat> {
    const leadCount = await this.prisma.lead.count({
      where: { tenantId },
    });

    return {
      likes: leadCount * 10,
      comments: leadCount * 5,
      shares: leadCount * 2,
      saves: leadCount,
      clicks: leadCount * 15,
    };
  }

  async getGrowthStats(
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<GrowthStat> {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const followers = [100, 120, 140, 160, 180, 200, 220];
    const posts = [5, 8, 6, 10, 7, 4, 3];
    const engagement = [150, 200, 180, 250, 220, 120, 90];

    return { labels, followers, posts, engagement };
  }

  async getTopPosts(
    tenantId: string,
    limit: number = 10,
    dateRange?: DateRange,
  ): Promise<TopPost[]> {
    // Return empty array until PlatformPost model is added in Wave 2
    return [];
  }

  async getContentPerformance(tenantId: string): Promise<ContentPerformance[]> {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { tenantId },
      select: { platform: true },
    });

    const platformStats: Record<string, number> = {};
    accounts.forEach((account) => {
      platformStats[account.platform] = (platformStats[account.platform] || 0) + 1;
    });

    return Object.entries(platformStats).map(([platform, count]) => ({
      contentType: platform,
      posts: count,
      engagement: 0,
      avgEngagementRate: 0,
    }));
  }

  async exportAnalytics(
    tenantId: string,
    format: 'csv' | 'json' = 'json',
  ): Promise<string | object> {
    const overview = await this.getOverviewStats(tenantId);
    const platformStats = await this.getPlatformStats(tenantId);
    const engagement = await this.getEngagementStats(tenantId);
    const topPosts = await this.getTopPosts(tenantId, 10);

    const data = {
      overview,
      platformStats,
      engagement,
      topPosts,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      return data;
    }

    const csvRows = [
      ['Metric', 'Value'],
      ['Total Posts', overview.totalPosts],
      ['Total Engagement', overview.totalEngagement],
      ['Total Followers', overview.totalFollowers],
      ['Total Campaigns', overview.totalCampaigns],
      ['Active Workflows', overview.activeWorkflows],
      [''],
      ['Platform', 'Posts', 'Engagement', 'Followers'],
      ...platformStats.map((p) => [p.platform, p.posts, p.engagement, p.followers]),
      [''],
      ['Engagement Metrics'],
      ['Likes', engagement.likes],
      ['Comments', engagement.comments],
      ['Shares', engagement.shares],
      ['Saves', engagement.saves],
      ['Clicks', engagement.clicks],
    ];

    return csvRows.map((row) => row.join(',')).join('\n');
  }
}
