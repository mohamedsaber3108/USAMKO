import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedInSessionsService } from './linkedin-sessions.service';
import { LinkedInMessagesService } from './linkedin-messages.service';

export interface SendContact {
  firstName: string;
  profileUrl: string;
  status?: string;
}

export interface SendCampaign {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  messageTemplate: string;
  contacts: SendContact[];
  delayMin: number;
  delayMax: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalSent: number;
  totalFailed: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class LinkedInSenderService {
  private readonly logger = new Logger(LinkedInSenderService.name);
  private activeCampaigns: Map<string, { cancel: boolean; campaign: SendCampaign }> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: LinkedInSessionsService,
    private readonly messagesService: LinkedInMessagesService,
  ) {}

  async createCampaign(
    tenantId: string,
    userId: string,
    data: {
      name: string;
      messageTemplate: string;
      contacts: SendContact[];
      delayMin?: number;
      delayMax?: number;
    },
  ): Promise<SendCampaign> {
    const campaign: SendCampaign = {
      id: this.generateId(),
      tenantId,
      userId,
      name: data.name,
      messageTemplate: data.messageTemplate,
      contacts: data.contacts,
      delayMin: data.delayMin || 30,
      delayMax: data.delayMax || 60,
      status: 'draft',
      progress: 0,
      totalSent: 0,
      totalFailed: 0,
      createdAt: new Date(),
    };

    // Store campaign in database
    await this.prisma.linkedInMessage.create({
      data: {
        tenantId,
        userId,
        profileId: 'campaign-record',
        body: JSON.stringify(campaign),
        subject: `campaign:${campaign.id}`,
        status: 'draft',
        sentAt: new Date(),
      },
    });

    return campaign;
  }

  async startCampaign(
    tenantId: string,
    userId: string,
    campaignId: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.sessionsService.getActiveSession(tenantId, userId);
    if (!session) {
      return { success: false, message: 'No active LinkedIn session. Please login first.' };
    }

    const campaignRecord = await this.getCampaign(tenantId, campaignId);
    if (!campaignRecord) {
      return { success: false, message: 'Campaign not found' };
    }

    if (campaignRecord.status === 'running') {
      return { success: false, message: 'Campaign is already running' };
    }

    campaignRecord.status = 'running';
    campaignRecord.startedAt = new Date();
    this.activeCampaigns.set(campaignId, { cancel: false, campaign: campaignRecord });

    // Run asynchronously
    this.executeCampaign(tenantId, userId, campaignRecord, session.cookies).catch(err => {
      this.logger.error(`Campaign ${campaignId} failed: ${err.message}`);
    });

    return { success: true, message: 'Campaign started' };
  }

  async pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
    const active = this.activeCampaigns.get(campaignId);
    if (active) {
      active.cancel = true;
      active.campaign.status = 'paused';
    }
    return { success: true };
  }

  async getCampaign(tenantId: string, campaignId: string): Promise<SendCampaign | null> {
    // Check active campaigns first
    const active = this.activeCampaigns.get(campaignId);
    if (active) return active.campaign;

    // Look up from DB
    const record = await this.prisma.linkedInMessage.findFirst({
      where: {
        tenantId,
        subject: `campaign:${campaignId}`,
      },
    });

    if (!record) return null;
    return JSON.parse(record.body) as SendCampaign;
  }

  async getCampaigns(tenantId: string, userId: string): Promise<SendCampaign[]> {
    const records = await this.prisma.linkedInMessage.findMany({
      where: {
        tenantId,
        userId,
        subject: { startsWith: 'campaign:' },
      },
      orderBy: { sentAt: 'desc' },
    });

    return records.map(r => {
      try {
        return JSON.parse(r.body) as SendCampaign;
      } catch {
        return null;
      }
    }).filter(Boolean) as SendCampaign[];
  }

  async getCampaignStatus(campaignId: string): Promise<{ status: string; progress: number; totalSent: number; totalFailed: number } | null> {
    const active = this.activeCampaigns.get(campaignId);
    if (active) {
      return {
        status: active.campaign.status,
        progress: active.campaign.progress,
        totalSent: active.campaign.totalSent,
        totalFailed: active.campaign.totalFailed,
      };
    }
    return null;
  }

  private async executeCampaign(
    tenantId: string,
    userId: string,
    campaign: SendCampaign,
    encryptedCookies: string,
  ): Promise<void> {
    let browser: any = null;

    try {
      const { chromium } = require('playwright');

      // Decode the stored cookies
      const cookiesJson = Buffer.from(encryptedCookies, 'base64').toString('utf-8');
      let cookies: any[] = [];
      try {
        cookies = JSON.parse(cookiesJson);
      } catch {
        // If cookies is just a session string, wrap it
        cookies = [{ name: 'li_at', value: cookiesJson, domain: '.linkedin.com', path: '/' }];
      }

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // Set LinkedIn cookies
      if (cookies.length > 0) {
        await context.addCookies(cookies);
      }

      const page = await context.newPage();

      // Verify login
      await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.delay(3000);

      if (page.url().includes('login') || page.url().includes('checkpoint')) {
        campaign.status = 'failed';
        this.saveCampaignState(tenantId, campaign);
        this.activeCampaigns.delete(campaign.id);
        this.logger.error('LinkedIn session expired. Please re-login.');
        return;
      }

      this.logger.log(`Campaign ${campaign.id}: Starting to send ${campaign.contacts.length} messages`);

      const pendingContacts = campaign.contacts.filter(c => c.status !== 'sent');

      for (let i = 0; i < pendingContacts.length; i++) {
        const active = this.activeCampaigns.get(campaign.id);
        if (!active || active.cancel) {
          campaign.status = 'paused';
          break;
        }

        const contact = pendingContacts[i];
        const message = this.buildMessage(campaign.messageTemplate, contact);

        this.logger.log(`[${i + 1}/${pendingContacts.length}] Sending to ${contact.firstName}...`);

        const result = await this.sendSingleMessage(page, contact.profileUrl, message);
        contact.status = result;

        if (result === 'sent') {
          campaign.totalSent++;
          // Record in messages DB
          try {
            await this.messagesService.create(tenantId, userId, 'bulk-campaign', message, {
              subject: `Campaign: ${campaign.name}`,
              threadId: campaign.id,
            });
          } catch {}
        } else {
          campaign.totalFailed++;
        }

        campaign.progress = Math.round(((i + 1) / pendingContacts.length) * 100);
        this.saveCampaignState(tenantId, campaign);

        // Delay between messages
        if (i < pendingContacts.length - 1) {
          const delay = this.randomDelay(campaign.delayMin, campaign.delayMax);
          this.logger.log(`  Waiting ${delay}s before next message...`);
          await this.delay(delay * 1000);
        }
      }

      if (campaign.status === 'running') {
        campaign.status = 'completed';
        campaign.completedAt = new Date();
      }

      this.saveCampaignState(tenantId, campaign);
      this.activeCampaigns.delete(campaign.id);

      this.logger.log(`Campaign ${campaign.id} finished: ${campaign.totalSent} sent, ${campaign.totalFailed} failed`);
    } catch (error) {
      this.logger.error(`Campaign execution error: ${error.message}`);
      campaign.status = 'failed';
      this.saveCampaignState(tenantId, campaign);
      this.activeCampaigns.delete(campaign.id);
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
      }
    }
  }

  private async sendSingleMessage(page: any, profileUrl: string, message: string): Promise<string> {
    try {
      const url = this.fixUrl(profileUrl);
      if (!url) return 'no_url';

      await page.goto(url, { timeout: 40000, waitUntil: 'domcontentloaded' });
      await this.delay(3000 + Math.random() * 1000);

      // Check for security checkpoint
      if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
        this.logger.warn('Security checkpoint detected - skipping contact');
        return 'checkpoint_blocked';
      }

      // Scroll to make button visible
      await page.evaluate(() => window.scrollBy(0, 200));
      await this.delay(1500);

      // Click Message button via JavaScript (bypasses LinkedIn's click blocks)
      const messageClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const msgBtn = (buttons as HTMLElement[]).find(el => el.innerText.trim().toLowerCase() === 'message');
        if (msgBtn) {
          msgBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          msgBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          msgBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        }
        return false;
      });

      if (!messageClicked) {
        // Fallback: try Playwright locators
        try {
          const btn = page.locator('button:has-text("Message")').first();
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
          } else {
            return 'message_button_not_found';
          }
        } catch {
          return 'message_button_not_found';
        }
      }

      await this.delay(2000 + Math.random() * 1000);

      // Wait for chat textbox
      const textboxSelectors = [
        'div.msg-form__contenteditable',
        'div[contenteditable="true"]',
        'div[role="textbox"]',
      ];

      let textBox: any = null;
      for (const sel of textboxSelectors) {
        try {
          const loc = page.locator(sel).first();
          if (await loc.isVisible({ timeout: 3000 })) {
            textBox = loc;
            break;
          }
        } catch {}
      }

      if (!textBox) return 'chat_window_did_not_open';

      // Click and type message
      await textBox.click();
      await this.delay(500);
      await page.keyboard.type(message, { delay: 30 + Math.random() * 20 });
      await this.delay(1000 + Math.random() * 500);

      // Click Send button
      const sentViaJs = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const sendBtn = (btns as HTMLButtonElement[]).find(b =>
          b.innerText.trim().toLowerCase() === 'send' ||
          b.getAttribute('type') === 'submit' ||
          b.className.includes('send')
        );
        if (sendBtn) {
          sendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          sendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        }
        return false;
      });

      if (!sentViaJs) {
        // Fallback: try locator or Enter key
        try {
          const sendBtn = page.locator('button.msg-form__send-button, button[type="submit"], button:has-text("Send")').first();
          if (await sendBtn.isVisible({ timeout: 2000 })) {
            await sendBtn.click();
          } else {
            await page.keyboard.press('Enter');
          }
        } catch {
          await page.keyboard.press('Enter');
        }
      }

      await this.delay(2000 + Math.random() * 1000);

      // Close chat window
      try {
        const closeBtn = page.locator('button[aria-label="Dismiss"]').first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
        }
      } catch {}

      return 'sent';
    } catch (error) {
      this.logger.warn(`Send failed: ${error.message}`);
      return `error: ${error.message}`;
    }
  }

  private buildMessage(template: string, contact: SendContact): string {
    return template
      .replace(/\{first_name\}/g, contact.firstName || '')
      .replace(/\{firstName\}/g, contact.firstName || '')
      .replace(/\{name\}/g, contact.firstName || '')
      .replace(/\{profile_url\}/g, contact.profileUrl || '');
  }

  private fixUrl(url: string): string {
    if (!url) return '';
    url = url.trim();
    if (!url.startsWith('http')) {
      url = 'https://www.linkedin.com/in/' + url.split('/in/').pop();
    }
    return url;
  }

  private async saveCampaignState(tenantId: string, campaign: SendCampaign): Promise<void> {
    try {
      await this.prisma.linkedInMessage.updateMany({
        where: {
          tenantId,
          subject: `campaign:${campaign.id}`,
        },
        data: {
          body: JSON.stringify(campaign),
          status: campaign.status,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to save campaign state: ${err.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateId(): string {
    return 'camp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
}
