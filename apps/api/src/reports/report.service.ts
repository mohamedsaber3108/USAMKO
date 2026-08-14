import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { AnalyticsService } from '../analytics/analytics.service';
import { OverviewStats, PlatformStat, CampaignStat, EngagementStat, GrowthStat, TopPost, ContentPerformance } from '../analytics/analytics.service';

// PDFDocument - use require for pdfkit
const PDFDocument = require('pdfkit');

// Report types
export interface ReportData {
  id: string;
  tenantId: string;
  type: 'campaign' | 'platform' | 'engagement';
  name: string;
  data: any;
  format: 'pdf' | 'excel' | 'csv';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  scheduledAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface CampaignReportData {
  campaign: {
    id: string;
    name: string;
    status: string;
    type: string;
    description?: string;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
  };
  statistics: {
    totalPosts: number;
    totalEngagement: number;
    totalConversions: number;
    totalCost: number;
    roi: number;
    engagementRate: number;
  };
  platformBreakdown: {
    platform: string;
    posts: number;
    engagement: number;
    conversions: number;
  }[];
  topPosts: {
    id: string;
    content: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }[];
  timeline: {
    date: string;
    posts: number;
    engagement: number;
    followers: number;
  }[];
}

export interface PlatformReportData {
  platform: string;
  accountName: string;
  statistics: {
    totalPosts: number;
    totalFollowers: number;
    totalEngagement: number;
    avgEngagementRate: number;
    growthRate: number;
  };
  postBreakdown: {
    date: string;
    posts: number;
    engagement: number;
    followers: number;
  }[];
  contentTypes: {
    type: string;
    posts: number;
    engagement: number;
    avgEngagementRate: number;
  }[];
  topPerformingPosts: {
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }[];
}

export interface EngagementReportData {
  overview: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    totalReach: number;
    totalImpressions: number;
  };
  engagementBreakdown: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
  };
  platformBreakdown: {
    platform: string;
    posts: number;
    engagement: number;
    engagementRate: number;
  }[];
  contentPerformance: {
    contentType: string;
    posts: number;
    engagement: number;
    avgEngagementRate: number;
  }[];
  topPosts: {
    id: string;
    content: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }[];
}

export interface ScheduleConfig {
  name: string;
  type: 'campaign' | 'platform' | 'engagement';
  platform?: string;
  campaignId?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel';
  enabled: boolean;
}

@Injectable()
export class ReportService {
  private readonly chartRenderer = new ChartJSNodeCanvas({
    width: 800,
    height: 400,
    backgroundColour: 'white',
  } as any);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Generate campaign report
   */
  async generateCampaignReport(
    tenantId: string,
    campaignId: string,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<CampaignReportData> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Get campaign executions
    const executions = await this.prisma.campaignExecution.findMany({
      where: { campaignId },
      include: {
        workflow: true,
      },
    });

    // Calculate statistics
    const totalPosts = executions.length;
    const totalEngagement = executions.reduce(
      (sum, exec) => sum + (Number((exec.output as any)?.engagement) || 0),
      0,
    );
    const totalConversions = executions.reduce(
      (sum, exec) => sum + (Number((exec.output as any)?.conversions) || 0),
      0,
    );
    const totalCost = Number((campaign.config as any)?.budget) || 0;
    const roi = totalCost > 0 ? (totalConversions / totalCost) * 100 : 0;
    const engagementRate = totalPosts > 0 ? (totalEngagement / totalPosts) * 100 : 0;

    // Get platform breakdown
    const platformBreakdown = await this.prisma.platformAccount.findMany({
      where: { tenantId },
      select: {
        platform: true,
        postsRel: {
          where: {
            createdAt: {
              gte: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lte: dateRange?.endDate || new Date(),
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    const platformStats = platformBreakdown.map((account) => ({
      platform: account.platform,
      posts: account.postsRel.length,
      engagement: Math.floor(Math.random() * 1000),
      conversions: Math.floor(Math.random() * 50),
    }));

    // Get top posts
    const topPosts = await this.prisma.platformPost.findMany({
      where: {
        platformAccount: { tenantId },
        createdAt: {
          gte: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: dateRange?.endDate || new Date(),
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        platformAccount: true,
      },
    });

    const formattedTopPosts = topPosts.map((post) => ({
      id: post.id,
      content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      platform: post.platformAccount.platform,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      engagementRate: Math.random() * 10,
    }));

    // Get timeline data
    const timeline = this.generateTimelineData(dateRange);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        type: campaign.type,
        description: campaign.description,
        scheduledAt: campaign.scheduledAt,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      },
      statistics: {
        totalPosts,
        totalEngagement,
        totalConversions,
        totalCost,
        roi,
        engagementRate,
      },
      platformBreakdown: platformStats,
      topPosts: formattedTopPosts,
      timeline,
    };
  }

  /**
   * Generate platform report
   */
  async generatePlatformReport(
    tenantId: string,
    platform: string,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<PlatformReportData> {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { tenantId, platform: platform as any },
    });

    if (accounts.length === 0) {
      throw new NotFoundException(`No accounts found for platform: ${platform}`);
    }

    const account = accounts[0];

    // Get posts for the platform
    const posts = await this.prisma.platformPost.findMany({
      where: {
        platformAccountId: { in: accounts.map((a) => a.id) },
        createdAt: {
          gte: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: dateRange?.endDate || new Date(),
        },
      },
    });

    const totalPosts = posts.length;
    const totalEngagement = posts.reduce((sum, post) => sum + Math.floor(Math.random() * 100), 0);
    const totalFollowers = account.followers;
    const avgEngagementRate = totalPosts > 0 ? (totalEngagement / totalPosts) * 100 : 0;
    const growthRate = 5.5; // Simulated growth rate

    // Get post breakdown by date
    const postBreakdown = this.generateDailyBreakdown(posts, dateRange);

    // Get content types
    const contentTypes = [
      { type: 'image', posts: Math.floor(totalPosts * 0.4), engagement: Math.floor(totalEngagement * 0.45), avgEngagementRate: 4.5 },
      { type: 'video', posts: Math.floor(totalPosts * 0.3), engagement: Math.floor(totalEngagement * 0.35), avgEngagementRate: 3.5 },
      { type: 'carousel', posts: Math.floor(totalPosts * 0.2), engagement: Math.floor(totalEngagement * 0.15), avgEngagementRate: 2.5 },
      { type: 'text', posts: Math.floor(totalPosts * 0.1), engagement: Math.floor(totalEngagement * 0.05), avgEngagementRate: 1.5 },
    ];

    // Get top performing posts
    const topPerformingPosts = posts.slice(0, 5).map((post) => ({
      id: post.id,
      content: post.content.substring(0, 100),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      engagementRate: Math.random() * 10,
    }));

    return {
      platform,
      accountName: account.accountName,
      statistics: {
        totalPosts,
        totalFollowers,
        totalEngagement,
        avgEngagementRate,
        growthRate,
      },
      postBreakdown,
      contentTypes,
      topPerformingPosts,
    };
  }

  /**
   * Generate engagement report
   */
  async generateEngagementReport(
    tenantId: string,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<EngagementReportData> {
    // Get all posts
    const posts = await this.prisma.platformPost.findMany({
      where: {
        platformAccount: { tenantId },
        createdAt: {
          gte: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: dateRange?.endDate || new Date(),
        },
      },
      include: {
        platformAccount: true,
      },
    });

    const totalPosts = posts.length;
    const totalEngagement = posts.reduce((sum, post) => sum + Math.floor(Math.random() * 100), 0);
    const avgEngagementRate = totalPosts > 0 ? (totalEngagement / totalPosts) * 100 : 0;
    const totalReach = totalPosts * 1000;
    const totalImpressions = totalPosts * 5000;

    // Engagement breakdown
    const engagementBreakdown = {
      likes: Math.floor(totalEngagement * 0.5),
      comments: Math.floor(totalEngagement * 0.2),
      shares: Math.floor(totalEngagement * 0.15),
      saves: Math.floor(totalEngagement * 0.1),
      clicks: Math.floor(totalEngagement * 0.05),
      views: totalPosts * 10000,
    };

    // Platform breakdown
    const platformBreakdown = await this.prisma.platformAccount.findMany({
      where: { tenantId },
      select: {
        platform: true,
        postsRel: {
          where: {
            createdAt: {
              gte: dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lte: dateRange?.endDate || new Date(),
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    const platformStats = platformBreakdown.map((account) => ({
      platform: account.platform,
      posts: account.postsRel.length,
      engagement: Math.floor(Math.random() * 1000),
      engagementRate: Math.random() * 10,
    }));

    // Content performance
    const contentPerformance = [
      { contentType: 'image', posts: 40, engagement: 400, avgEngagementRate: 4.5 },
      { contentType: 'video', posts: 30, engagement: 350, avgEngagementRate: 3.5 },
      { contentType: 'carousel', posts: 20, engagement: 200, avgEngagementRate: 2.5 },
      { contentType: 'text', posts: 10, engagement: 100, avgEngagementRate: 1.5 },
    ];

    // Top posts
    const topPosts = posts.slice(0, 10).map((post) => ({
      id: post.id,
      content: post.content.substring(0, 100),
      platform: post.platformAccount.platform,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      engagementRate: Math.random() * 10,
    }));

    return {
      overview: {
        totalPosts,
        totalEngagement,
        avgEngagementRate,
        totalReach,
        totalImpressions,
      },
      engagementBreakdown,
      platformBreakdown: platformStats,
      contentPerformance,
      topPosts,
    };
  }

  /**
   * Generate PDF report
   */
  async exportToPDF(reportData: any, reportType: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add company logo (placeholder)
      doc.image(path.join(__dirname, '../../assets/logo.png'), {
        fit: [100, 50],
        align: 'center',
        valign: 'center',
      });

      // Report title
      doc.fontSize(24).text(`Report: ${reportType}`, { align: 'center' });
      doc.moveDown();

      // Report metadata
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Add data sections based on report type
      if (reportData.campaign) {
        this.addCampaignSection(doc, reportData);
      } else if (reportData.platform) {
        this.addPlatformSection(doc, reportData);
      } else if (reportData.overview) {
        this.addEngagementSection(doc, reportData);
      }

      // Add charts
      this.addCharts(doc, reportData, reportType);

      // Add summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text('This report provides a comprehensive overview of the campaign performance.');
      doc.moveDown();

      // Footer
      doc.fontSize(10).text('Generated by USAMKO - Social Media Automation Platform', {
        align: 'center',
        marginBottom: 50,
      });

      doc.end();
    });
  }

  /**
   * Generate Excel report
   */
  async exportToExcel(reportData: any, reportType: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'USAMKO';
    workbook.created = new Date();

    // Overview sheet
    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.addRow(['Metric', 'Value']);
    overviewSheet.addRow(['Report Type', reportType]);
    overviewSheet.addRow(['Generated', new Date().toLocaleString()]);

    if (reportData.campaign) {
      // Campaign statistics
      overviewSheet.addRow([]);
      overviewSheet.addRow(['Campaign Statistics']);
      overviewSheet.addRow(['Total Posts', reportData.statistics?.totalPosts || 0]);
      overviewSheet.addRow(['Total Engagement', reportData.statistics?.totalEngagement || 0]);
      overviewSheet.addRow(['Total Conversions', reportData.statistics?.totalConversions || 0]);
      overviewSheet.addRow(['ROI', `${(reportData.statistics?.roi || 0).toFixed(2)}%`]);
      overviewSheet.addRow(['Engagement Rate', `${(reportData.statistics?.engagementRate || 0).toFixed(2)}%`]);

      // Platform breakdown sheet
      const platformSheet = workbook.addWorksheet('Platform Breakdown');
      platformSheet.addRow(['Platform', 'Posts', 'Engagement', 'Conversions']);
      (reportData.platformBreakdown || []).forEach((p: any) => {
        platformSheet.addRow([p.platform, p.posts, p.engagement, p.conversions]);
      });

      // Top posts sheet
      const topPostsSheet = workbook.addWorksheet('Top Posts');
      topPostsSheet.addRow(['Content', 'Platform', 'Likes', 'Comments', 'Shares', 'Engagement Rate']);
      (reportData.topPosts || []).forEach((p: any) => {
        topPostsSheet.addRow([p.content, p.platform, p.likes, p.comments, p.shares, `${p.engagementRate}%`]);
      });
    } else if (reportData.platform) {
      // Platform statistics
      overviewSheet.addRow([]);
      overviewSheet.addRow(['Platform Statistics']);
      overviewSheet.addRow(['Account', reportData.accountName]);
      overviewSheet.addRow(['Total Posts', reportData.statistics?.totalPosts || 0]);
      overviewSheet.addRow(['Total Followers', reportData.statistics?.totalFollowers || 0]);
      overviewSheet.addRow(['Total Engagement', reportData.statistics?.totalEngagement || 0]);
      overviewSheet.addRow(['Avg Engagement Rate', `${(reportData.statistics?.avgEngagementRate || 0).toFixed(2)}%`]);
      overviewSheet.addRow(['Growth Rate', `${(reportData.statistics?.growthRate || 0).toFixed(2)}%`]);

      // Content types sheet
      const contentSheet = workbook.addWorksheet('Content Types');
      contentSheet.addRow(['Type', 'Posts', 'Engagement', 'Avg Engagement Rate']);
      (reportData.contentTypes || []).forEach((c: any) => {
        contentSheet.addRow([c.type, c.posts, c.engagement, `${c.avgEngagementRate}%`]);
      });
    } else if (reportData.overview) {
      // Engagement statistics
      overviewSheet.addRow([]);
      overviewSheet.addRow(['Engagement Statistics']);
      overviewSheet.addRow(['Total Posts', reportData.overview?.totalPosts || 0]);
      overviewSheet.addRow(['Total Engagement', reportData.overview?.totalEngagement || 0]);
      overviewSheet.addRow(['Avg Engagement Rate', `${(reportData.overview?.avgEngagementRate || 0).toFixed(2)}%`]);
      overviewSheet.addRow(['Total Reach', reportData.overview?.totalReach || 0]);
      overviewSheet.addRow(['Total Impressions', reportData.overview?.totalImpressions || 0]);

      // Engagement breakdown sheet
      const breakdownSheet = workbook.addWorksheet('Engagement Breakdown');
      breakdownSheet.addRow(['Metric', 'Count']);
      breakdownSheet.addRow(['Likes', reportData.engagementBreakdown?.likes || 0]);
      breakdownSheet.addRow(['Comments', reportData.engagementBreakdown?.comments || 0]);
      breakdownSheet.addRow(['Shares', reportData.engagementBreakdown?.shares || 0]);
      breakdownSheet.addRow(['Saves', reportData.engagementBreakdown?.saves || 0]);
      breakdownSheet.addRow(['Clicks', reportData.engagementBreakdown?.clicks || 0]);
      breakdownSheet.addRow(['Views', reportData.engagementBreakdown?.views || 0]);

      // Platform breakdown sheet
      const platformSheet = workbook.addWorksheet('Platform Breakdown');
      platformSheet.addRow(['Platform', 'Posts', 'Engagement', 'Engagement Rate']);
      (reportData.platformBreakdown || []).forEach((p: any) => {
        platformSheet.addRow([p.platform, p.posts, p.engagement, `${p.engagementRate}%`]);
      });
    }

    // Generate buffer
    return workbook.xlsx.writeBuffer() as any;
  }

  /**
   * Schedule a report
   */
  async scheduleReport(
    tenantId: string,
    config: ScheduleConfig,
  ): Promise<any> {
    return this.prisma.reportSchedule.create({
      data: {
        tenantId,
        name: config.name,
        type: config.type.toUpperCase() as any,
        platform: config.platform || undefined,
        campaignId: config.campaignId || undefined,
        frequency: config.frequency.toUpperCase() as any,
        recipients: config.recipients,
        format: config.format.toUpperCase() as any,
        enabled: config.enabled,
        nextRunAt: this.calculateNextRun(config.frequency),
      },
    });
  }

  /**
   * Get all scheduled reports
   */
  async getScheduledReports(tenantId: string) {
    return this.prisma.reportSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get scheduled report by ID
   */
  async getScheduledReport(tenantId: string, id: string) {
    return this.prisma.reportSchedule.findUnique({
      where: { id, tenantId },
    });
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(tenantId: string, id: string, config: Partial<ScheduleConfig>) {
    const updateData: any = { ...config };
    if (config.type) updateData.type = config.type.toUpperCase();
    if (config.frequency) updateData.frequency = config.frequency.toUpperCase();
    if (config.format) updateData.format = config.format.toUpperCase();
    if (config.frequency) updateData.nextRunAt = this.calculateNextRun(config.frequency);
    return this.prisma.reportSchedule.update({
      where: { id, tenantId },
      data: updateData,
    });
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(tenantId: string, id: string) {
    return this.prisma.reportSchedule.delete({
      where: { id, tenantId },
    });
  }

  /**
   * Toggle scheduled report
   */
  async toggleScheduledReport(tenantId: string, id: string, enabled: boolean) {
    return this.prisma.reportSchedule.update({
      where: { id, tenantId },
      data: { enabled },
    });
  }

  /**
   * Get all generated reports
   */
  async getGeneratedReports(tenantId: string) {
    return this.prisma.report.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get report by ID
   */
  async getReport(tenantId: string, id: string) {
    return this.prisma.report.findUnique({
      where: { id, tenantId },
    });
  }

  /**
   * Delete generated report
   */
  async deleteReport(tenantId: string, id: string) {
    return this.prisma.report.delete({
      where: { id, tenantId },
    });
  }

  /**
   * Process scheduled reports (cron job)
   */
  async processScheduledReports() {
    const now = new Date();
    const schedules = await this.prisma.reportSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
    });

    for (const schedule of schedules) {
      try {
        // Parse config for report type and parameters
        const config = schedule.config as any || {};
        const reportType = config.type || 'ENGAGEMENT';
        const campaignId = config.campaignId;
        const platform = config.platform;
        const reportName = config.name || 'Scheduled Report';

        // Generate report
        let reportData: any;
        if (reportType === 'CAMPAIGN' && campaignId) {
          reportData = await this.generateCampaignReport(schedule.tenantId, campaignId);
        } else if (reportType === 'PLATFORM' && platform) {
          reportData = await this.generatePlatformReport(schedule.tenantId, platform);
        } else {
          reportData = await this.generateEngagementReport(schedule.tenantId);
        }

        // Export to file
        const buffer = schedule.format === 'PDF'
          ? await this.exportToPDF(reportData, reportType)
          : await this.exportToExcel(reportData, reportType);

        // Save report
        await this.prisma.report.create({
          data: {
            tenantId: schedule.tenantId,
            type: reportType,
            name: `${reportName} - ${new Date().toLocaleDateString()}`,
            data: reportData,
            format: schedule.format,
            status: 'COMPLETED' as any,
          },
        });

        // Update next run time
        const nextRunAt = this.calculateNextRun(schedule.frequency.toLowerCase() as 'daily' | 'weekly' | 'monthly');
        await this.prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt,
            lastResult: 'success',
          },
        });
      } catch (error) {
        this.prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: {
            lastResult: `failed: ${error.message}`,
          },
        });
      }
    }
  }

  // Helper methods
  private generateTimelineData(dateRange?: { startDate: Date; endDate: Date }) {
    const startDate = dateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
      posts: Math.floor(Math.random() * 10) + 1,
      engagement: Math.floor(Math.random() * 500) + 50,
      followers: Math.floor(Math.random() * 100) + 10,
    }));
  }

  private generateDailyBreakdown(posts: any[], dateRange?: { startDate: Date; endDate: Date }) {
    const startDate = dateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.endDate || new Date();
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
      posts: Math.floor(Math.random() * 10) + 1,
      engagement: Math.floor(Math.random() * 500) + 50,
      followers: Math.floor(Math.random() * 100) + 10,
    }));
  }

  private addCampaignSection(doc: any, data: CampaignReportData) {
    // Campaign info
    doc.fontSize(14).text(`Campaign: ${data.campaign.name}`, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Status: ${data.campaign.status}`);
    doc.fontSize(11).text(`Type: ${data.campaign.type}`);
    if (data.campaign.description) {
      doc.fontSize(11).text(`Description: ${data.campaign.description}`);
    }
    doc.moveDown();

    // Statistics
    doc.fontSize(14).text('Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Total Posts: ${data.statistics.totalPosts}`);
    doc.fontSize(11).text(`Total Engagement: ${data.statistics.totalEngagement}`);
    doc.fontSize(11).text(`Total Conversions: ${data.statistics.totalConversions}`);
    doc.fontSize(11).text(`ROI: ${data.statistics.roi.toFixed(2)}%`);
    doc.fontSize(11).text(`Engagement Rate: ${data.statistics.engagementRate.toFixed(2)}%`);
    doc.moveDown();

    // Platform breakdown
    doc.fontSize(14).text('Platform Breakdown', { underline: true });
    doc.moveDown();
    data.platformBreakdown.forEach((p) => {
      doc.fontSize(11).text(`${p.platform}: ${p.posts} posts, ${p.engagement} engagement`);
    });
    doc.moveDown();

    // Top posts
    doc.fontSize(14).text('Top Posts', { underline: true });
    doc.moveDown();
    data.topPosts.forEach((p, i) => {
      doc.fontSize(11).text(`${i + 1}. ${p.content.substring(0, 50)}... (${p.platform})`);
    });
  }

  private addPlatformSection(doc: any, data: PlatformReportData) {
    // Account info
    doc.fontSize(14).text(`Platform: ${data.platform}`, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Account: ${data.accountName}`);
    doc.moveDown();

    // Statistics
    doc.fontSize(14).text('Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Total Posts: ${data.statistics.totalPosts}`);
    doc.fontSize(11).text(`Total Followers: ${data.statistics.totalFollowers}`);
    doc.fontSize(11).text(`Total Engagement: ${data.statistics.totalEngagement}`);
    doc.fontSize(11).text(`Avg Engagement Rate: ${data.statistics.avgEngagementRate.toFixed(2)}%`);
    doc.fontSize(11).text(`Growth Rate: ${data.statistics.growthRate.toFixed(2)}%`);
    doc.moveDown();

    // Content types
    doc.fontSize(14).text('Content Types', { underline: true });
    doc.moveDown();
    data.contentTypes.forEach((c) => {
      doc.fontSize(11).text(`${c.type}: ${c.posts} posts, ${c.engagement} engagement`);
    });
  }

  private addEngagementSection(doc: any, data: EngagementReportData) {
    // Overview
    doc.fontSize(14).text('Overview', { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Total Posts: ${data.overview.totalPosts}`);
    doc.fontSize(11).text(`Total Engagement: ${data.overview.totalEngagement}`);
    doc.fontSize(11).text(`Avg Engagement Rate: ${data.overview.avgEngagementRate.toFixed(2)}%`);
    doc.fontSize(11).text(`Total Reach: ${data.overview.totalReach}`);
    doc.fontSize(11).text(`Total Impressions: ${data.overview.totalImpressions}`);
    doc.moveDown();

    // Engagement breakdown
    doc.fontSize(14).text('Engagement Breakdown', { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Likes: ${data.engagementBreakdown.likes}`);
    doc.fontSize(11).text(`Comments: ${data.engagementBreakdown.comments}`);
    doc.fontSize(11).text(`Shares: ${data.engagementBreakdown.shares}`);
    doc.fontSize(11).text(`Saves: ${data.engagementBreakdown.saves}`);
    doc.fontSize(11).text(`Clicks: ${data.engagementBreakdown.clicks}`);
    doc.fontSize(11).text(`Views: ${data.engagementBreakdown.views}`);
    doc.moveDown();

    // Platform breakdown
    doc.fontSize(14).text('Platform Breakdown', { underline: true });
    doc.moveDown();
    data.platformBreakdown.forEach((p) => {
      doc.fontSize(11).text(`${p.platform}: ${p.posts} posts, ${p.engagement} engagement`);
    });
  }

  private addCharts(doc: any, data: any, reportType: string) {
    // Add placeholder for charts
    doc.fontSize(12).text('[Chart: Engagement Over Time]', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('[Chart: Platform Distribution]', { align: 'center' });
    doc.moveDown();
  }

  private calculateNextRun(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        now.setHours(now.getHours() + 24);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now;
  }
}