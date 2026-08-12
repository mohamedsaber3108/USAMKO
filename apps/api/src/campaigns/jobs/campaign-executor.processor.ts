import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma.service';
import { BrowserService } from '../../automation/browser.service';
import { HumanBehaviorService } from '../../automation/human-behavior.service';
import {
  CampaignConfig,
  CampaignStatus,
  CampaignType,
  CampaignResult,
} from '../interfaces/campaign.interface';
import { CampaignService } from '../campaign.service';

interface CampaignJob {
  campaignId: string;
  tenantId: string;
}

@Processor('campaigns')
export class CampaignExecutorProcessor {
  private readonly logger = new Logger(CampaignExecutorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private browserService: BrowserService,
    private humanBehaviorService: HumanBehaviorService,
    private campaignService: CampaignService,
  ) {}

  @Process('execute-campaign')
  async executeCampaign(job: Job<CampaignJob>) {
    const { campaignId, tenantId } = job.data;

    this.logger.log(`Executing campaign: ${campaignId}`);

    try {
      // Get campaign
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: campaignId, tenantId },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Check if still running
      if (campaign.status !== CampaignStatus.RUNNING) {
        this.logger.warn(`Campaign ${campaignId} is not running, skipping`);
        return;
      }

      const config = campaign.config as unknown as CampaignConfig;
      const type = campaign.type as CampaignType;

      // Initialize results
      const results: CampaignResult = {
        totalActions: 0,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        startedAt: new Date(),
        errors: [],
        details: {},
      };

      // Execute based on campaign type
      switch (type) {
        case CampaignType.POST:
        case CampaignType.BULK_POST:
          await this.executePostCampaign(campaign, config, results, job);
          break;

        case CampaignType.FOLLOW:
          await this.executeFollowCampaign(campaign, config, results, job);
          break;

        case CampaignType.LIKE:
          await this.executeLikeCampaign(campaign, config, results, job);
          break;

        case CampaignType.COMMENT:
          await this.executeCommentCampaign(campaign, config, results, job);
          break;

        case CampaignType.MESSAGE:
        case CampaignType.BULK_MESSAGE:
          await this.executeMessageCampaign(campaign, config, results, job);
          break;

        default:
          throw new Error(`Unsupported campaign type: ${type}`);
      }

      // Mark as completed
      results.completedAt = new Date();
      await this.campaignService.updateResults(
        campaignId,
        results,
        CampaignStatus.COMPLETED,
      );

      this.logger.log(
        `Campaign ${campaignId} completed: ${results.successCount}/${results.totalActions} successful`,
      );
    } catch (error) {
      this.logger.error(`Campaign ${campaignId} failed: ${error.message}`);

      await this.campaignService.updateResults(
        campaignId,
        {
          errors: [
            {
              platform: 'system',
              error: error.message,
              timestamp: new Date(),
            },
          ],
        },
        CampaignStatus.FAILED,
      );

      throw error;
    }
  }

  /**
   * Execute post campaign (single or bulk)
   */
  private async executePostCampaign(
    campaign: any,
    config: CampaignConfig,
    results: CampaignResult,
    job: Job,
  ) {
    const platforms = config.platforms;
    results.totalActions = platforms.length;

    for (const platform of platforms) {
      try {
        // Update progress
        await job.progress((results.successCount / results.totalActions) * 100);

        // Get platform account
        const account = await this.prisma.platformAccount.findFirst({
          where: {
            tenantId: campaign.tenantId,
            platform: platform as any,
            status: 'CONNECTED' as any,
          },
        });

        if (!account) {
          this.logger.warn(`No active account for platform: ${platform}`);
          results.skipCount++;
          continue;
        }

        // Create post using platform API or browser automation
        const postId = await this.createPost(platform, account, config);

        // Record success
        results.successCount++;
        if (!results.details[platform]) {
          results.details[platform] = {
            success: 0,
            failed: 0,
            skipped: 0,
            postIds: [],
          };
        }
        results.details[platform].success++;
        results.details[platform].postIds.push(postId);

        // Random delay between posts (if configured)
        if (config.automation?.randomDelays) {
          const delay = this.randomInt(30000, 90000); // 30-90 seconds
          await this.sleep(delay);
        }
      } catch (error) {
        this.logger.error(`Failed to post on ${platform}: ${error.message}`);
        results.failureCount++;
        results.errors.push({
          platform,
          error: error.message,
          timestamp: new Date(),
        });

        if (!results.details[platform]) {
          results.details[platform] = {
            success: 0,
            failed: 0,
            skipped: 0,
          };
        }
        results.details[platform].failed++;
      }
    }
  }

  /**
   * Execute follow campaign
   */
  private async executeFollowCampaign(
    campaign: any,
    config: CampaignConfig,
    results: CampaignResult,
    job: Job,
  ) {
    const accounts = config.targeting?.accounts || [];
    results.totalActions = accounts.length * config.platforms.length;

    for (const platform of config.platforms) {
      const platformAccount = await this.prisma.platformAccount.findFirst({
        where: {
          tenantId: campaign.tenantId,
          platform: platform as any,
          status: 'CONNECTED' as any,
        },
      });

      if (!platformAccount) {
        results.skipCount += accounts.length;
        continue;
      }

      for (const targetAccount of accounts) {
        try {
          await job.progress((results.successCount / results.totalActions) * 100);

          // Follow using browser automation
          await this.followAccount(platform, platformAccount, targetAccount, config);

          results.successCount++;
          if (!results.details[platform]) {
            results.details[platform] = { success: 0, failed: 0, skipped: 0 };
          }
          results.details[platform].success++;

          // Rate limiting delay
          const delay = config.limits?.maxPerHour
            ? (3600000 / config.limits.maxPerHour) // Convert to ms
            : this.randomInt(60000, 120000); // 1-2 minutes default

          await this.sleep(delay);
        } catch (error) {
          this.logger.error(`Failed to follow ${targetAccount} on ${platform}: ${error.message}`);
          results.failureCount++;
          results.errors.push({
            platform,
            error: `Follow ${targetAccount}: ${error.message}`,
            timestamp: new Date(),
          });

          if (!results.details[platform]) {
            results.details[platform] = { success: 0, failed: 0, skipped: 0 };
          }
          results.details[platform].failed++;
        }
      }
    }
  }

  /**
   * Execute like campaign
   */
  private async executeLikeCampaign(
    campaign: any,
    config: CampaignConfig,
    results: CampaignResult,
    job: Job,
  ) {
    // Similar to follow campaign, but with like actions
    // Implementation would depend on specific platform logic
    this.logger.log('Like campaign execution not yet implemented');
  }

  /**
   * Execute comment campaign
   */
  private async executeCommentCampaign(
    campaign: any,
    config: CampaignConfig,
    results: CampaignResult,
    job: Job,
  ) {
    // Similar to follow campaign, but with comment actions
    this.logger.log('Comment campaign execution not yet implemented');
  }

  /**
   * Execute message campaign
   */
  private async executeMessageCampaign(
    campaign: any,
    config: CampaignConfig,
    results: CampaignResult,
    job: Job,
  ) {
    const accounts = config.targeting?.accounts || [];
    results.totalActions = accounts.length * config.platforms.length;

    for (const platform of config.platforms) {
      const platformAccount = await this.prisma.platformAccount.findFirst({
        where: {
          tenantId: campaign.tenantId,
          platform: platform as any,
          status: 'CONNECTED' as any,
        },
      });

      if (!platformAccount) {
        results.skipCount += accounts.length;
        continue;
      }

      for (const targetAccount of accounts) {
        try {
          await job.progress((results.successCount / results.totalActions) * 100);

          // Send message using browser automation
          await this.sendMessage(
            platform,
            platformAccount,
            targetAccount,
            config.content.text,
            config,
          );

          results.successCount++;
          if (!results.details[platform]) {
            results.details[platform] = { success: 0, failed: 0, skipped: 0 };
          }
          results.details[platform].success++;

          // Rate limiting delay (longer for messages)
          const delay = this.randomInt(120000, 240000); // 2-4 minutes
          await this.sleep(delay);
        } catch (error) {
          this.logger.error(`Failed to message ${targetAccount} on ${platform}: ${error.message}`);
          results.failureCount++;
          results.errors.push({
            platform,
            error: `Message ${targetAccount}: ${error.message}`,
            timestamp: new Date(),
          });

          if (!results.details[platform]) {
            results.details[platform] = { success: 0, failed: 0, skipped: 0 };
          }
          results.details[platform].failed++;
        }
      }
    }
  }

  /**
   * Create post on platform (API or browser)
   */
  private async createPost(
    platform: string,
    account: any,
    config: CampaignConfig,
  ): Promise<string> {
    // Use platform API if available and browser automation not forced
    if (!config.automation?.useBrowser) {
      // TODO: Call platform adapter
      this.logger.log(`Creating post on ${platform} via API`);
      return `api_post_${Date.now()}`;
    }

    // Use browser automation
    this.logger.log(`Creating post on ${platform} via browser automation`);
    const sessionId = await this.browserService.createSession({
      headless: true,
    });

    try {
      // Navigate and create post
      // TODO: Platform-specific automation logic
      return `browser_post_${Date.now()}`;
    } finally {
      await this.browserService.closeSession(sessionId);
    }
  }

  /**
   * Follow account using browser automation
   */
  private async followAccount(
    platform: string,
    account: any,
    targetAccount: string,
    config: CampaignConfig,
  ) {
    const sessionId = await this.browserService.createSession({
      headless: true,
      proxy: config.automation?.proxyRotation
        ? await this.getNextProxy()
        : undefined,
    });

    try {
      const session = this.browserService.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      // Set saved cookies
      if (account.cookies) {
        await this.browserService.setCookies(sessionId, JSON.parse(account.cookies));
      }

      // Navigate to profile
      const profileUrl = this.getProfileUrl(platform, targetAccount);
      await this.browserService.navigate(sessionId, profileUrl);

      // Wait and click follow button
      await this.sleep(2000);

      if (config.automation?.humanBehavior) {
        await this.humanBehaviorService.simulateReading(session.page, 3000);
        await this.humanBehaviorService.humanClick(session.page, 'button:has-text("Follow")');
      } else {
        await session.page.click('button:has-text("Follow")');
      }

      this.logger.log(`Followed ${targetAccount} on ${platform}`);
    } finally {
      await this.browserService.closeSession(sessionId);
    }
  }

  /**
   * Send message using browser automation
   */
  private async sendMessage(
    platform: string,
    account: any,
    targetAccount: string,
    message: string,
    config: CampaignConfig,
  ) {
    // Similar to followAccount but with messaging logic
    this.logger.log(`Sending message to ${targetAccount} on ${platform}`);
  }

  /**
   * Get profile URL for platform
   */
  private getProfileUrl(platform: string, username: string): string {
    const urls: Record<string, string> = {
      facebook: `https://facebook.com/${username}`,
      instagram: `https://instagram.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      linkedin: `https://linkedin.com/in/${username}`,
      tiktok: `https://tiktok.com/@${username}`,
    };
    return urls[platform] || '';
  }

  /**
   * Get next proxy (placeholder)
   */
  private async getNextProxy(): Promise<any> {
    // TODO: Integrate with ProxyService
    return undefined;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Random integer helper
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
