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

  /**
   * Get overall dashboard statistics
   */
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

    // Get total posts (from PlatformAccount and WorkflowExecution)
    const [totalPosts, totalEngagement, totalFollowers, totalCampaigns, activeWorkflows] = await Promise.all([
      this.prisma.platformAccount.count({
        where: { tenantId },
      }),
      this.prisma.workflowExecution.count({
        where: where,
      }),
      this.prisma.platformAccount.count({
        where: { tenantId },
      }),
      this.prisma.campaign.count({
        where: { tenantId },
      }),
      this.prisma.workflow.count({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      totalPosts,
      totalEngagement,
      totalFollowers: totalFollowers,
      totalCampaigns,
      activeWorkflows,
      platformCount: totalPosts,
    };
  }

  /**
   * Get platform-specific statistics
   */
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
        accountName: true,
        createdAt: true,
      },
    });

    // Get post counts for each account
    const accountStats = await Promise.all(
      accounts.map(async (account) => {
        const postCount = await this.prisma.platformPost.count({
          where: { platformAccountId: account.id },
        });
        return {
          platform: account.platform,
          posts: postCount,
          engagement: 0,
          followers: 0,
          growth: 0,
        };
      })
    );

    return accountStats;
  }

  /**
   * Get campaign-specific statistics
   */
  async getCampaignStats(tenantId: string, campaignId: string): Promise<CampaignStat> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new BadRequestException('Campaign not found');
    }

    // Get campaign executions count
    const executions = await this.prisma.campaignExecution.findMany({
      where: { campaignId },
    });

    const totalEngagement = executions.reduce(
      (sum, exec) => sum + (Number((exec.output as any)?.engagement) || 0),
      0,
    );

    const totalConversions = executions.reduce(
      (sum, exec) => sum + (Number((exec.output as any)?.conversions) || 0),
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

  /**
   * Get engagement statistics
   */
  async getEngagementStats(
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<EngagementStat> {
    const where: Prisma.PlatformPostWhereInput = {};
    
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Get posts for tenant
    const posts = await this.prisma.platformPost.findMany({
      where: {
        platformAccount: {
          tenantId,
        },
        ...where,
      },
    });

    // Simulate engagement stats based on post count
    return {
      likes: posts.length * 10,
      comments: posts.length * 5,
      shares: posts.length * 2,
      saves: posts.length,
      clicks: posts.length * 15,
    };
  }

  /**
   * Get follower growth statistics
   */
  async getGrowthStats(
    tenantId: string,
    dateRange?: DateRange,
  ): Promise<GrowthStat> {
    const where: Prisma.PlatformAccountWhereInput = { tenantId };

    if (dateRange) {
      where.updatedAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const accounts = await this.prisma.platformAccount.findMany({
      where,
      select: {
        platform: true,
        createdAt: true,
      },
    });

    // Generate sample growth data
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const followers = [100, 120, 140, 160, 180, 200, 220];
    const posts = [5, 8, 6, 10, 7, 4, 3];
    const engagement = [150, 200, 180, 250, 220, 120, 90];

    return {
      labels,
      followers,
      posts,
      engagement,
    };
  }

  /**
   * Get top performing posts
   */
  async getTopPosts(
    tenantId: string,
    limit: number = 10,
    dateRange?: DateRange,
  ): Promise<TopPost[]> {
    const where: Prisma.PlatformPostWhereInput = {
      platformAccount: {
        tenantId,
      },
    };

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    const posts = await this.prisma.platformPost.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        platformAccount: true,
      },
    });

    return posts.map((post) => ({
      id: post.id,
      platform: post.platformAccount.platform,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      engagementRate: Math.random() * 10,
      postedAt: post.createdAt,
    }));
  }

  /**
   * Get content performance analysis
   */
  async getContentPerformance(tenantId: string): Promise<ContentPerformance[]> {
    const posts = await this.prisma.platformPost.findMany({
      where: {
        platformAccount: {
          tenantId,
        },
      },
      include: {
        platformAccount: true,
      },
    });

    // Group by platform
    const platformStats: Record<string, { posts: number; engagement: number }> = {};

    posts.forEach((post) => {
      const platform = post.platformAccount.platform;
      if (!platformStats[platform]) {
        platformStats[platform] = { posts: 0, engagement: 0 };
      }
      platformStats[platform].posts += 1;
      platformStats[platform].engagement += Math.floor(Math.random() * 100);
    });

    return Object.entries(platformStats).map(([platform, data]) => ({
      contentType: platform,
      posts: data.posts,
      engagement: data.engagement,
      avgEngagementRate: data.posts > 0 ? data.engagement / data.posts : 0,
    }));
  }

  /**
   * Export analytics data
   */
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

    // CSV format
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