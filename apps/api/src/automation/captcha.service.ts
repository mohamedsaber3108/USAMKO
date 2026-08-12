import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CaptchaSolution {
  solution: string;
  solvedAt: Date;
  service: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly apiKey: string;
  private readonly service: 'anticaptcha' | '2captcha' | 'manual';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CAPTCHA_API_KEY', '');
    this.service = this.configService.get<any>('CAPTCHA_SERVICE', 'manual');

    if (!this.apiKey && this.service !== 'manual') {
      this.logger.warn('No CAPTCHA API key configured. Using manual mode.');
    }
  }

  /**
   * Solve reCAPTCHA v2
   */
  async solveRecaptchaV2(siteKey: string, pageUrl: string): Promise<CaptchaSolution> {
    if (this.service === 'manual') {
      return this.solveManually('reCAPTCHA v2', siteKey, pageUrl);
    }

    try {
      if (this.service === '2captcha') {
        return await this.solve2Captcha(siteKey, pageUrl, 'recaptchav2');
      } else if (this.service === 'anticaptcha') {
        return await this.solveAntiCaptcha(siteKey, pageUrl, 'RecaptchaV2');
      }
    } catch (error) {
      this.logger.error(`Failed to solve reCAPTCHA: ${error.message}`);
      return this.solveManually('reCAPTCHA v2', siteKey, pageUrl);
    }
  }

  /**
   * Solve reCAPTCHA v3
   */
  async solveRecaptchaV3(
    siteKey: string,
    pageUrl: string,
    action: string = 'submit',
  ): Promise<CaptchaSolution> {
    if (this.service === 'manual') {
      return this.solveManually('reCAPTCHA v3', siteKey, pageUrl);
    }

    try {
      if (this.service === '2captcha') {
        return await this.solve2Captcha(siteKey, pageUrl, 'recaptchav3', action);
      } else if (this.service === 'anticaptcha') {
        return await this.solveAntiCaptcha(siteKey, pageUrl, 'RecaptchaV3', action);
      }
    } catch (error) {
      this.logger.error(`Failed to solve reCAPTCHA v3: ${error.message}`);
      return this.solveManually('reCAPTCHA v3', siteKey, pageUrl);
    }
  }

  /**
   * Solve hCaptcha
   */
  async solveHCaptcha(siteKey: string, pageUrl: string): Promise<CaptchaSolution> {
    if (this.service === 'manual') {
      return this.solveManually('hCaptcha', siteKey, pageUrl);
    }

    try {
      if (this.service === '2captcha') {
        return await this.solve2Captcha(siteKey, pageUrl, 'hcaptcha');
      } else if (this.service === 'anticaptcha') {
        return await this.solveAntiCaptcha(siteKey, pageUrl, 'HCaptcha');
      }
    } catch (error) {
      this.logger.error(`Failed to solve hCaptcha: ${error.message}`);
      return this.solveManually('hCaptcha', siteKey, pageUrl);
    }
  }

  /**
   * Solve using 2Captcha service
   */
  private async solve2Captcha(
    siteKey: string,
    pageUrl: string,
    method: string,
    action?: string,
  ): Promise<CaptchaSolution> {
    const baseUrl = 'https://2captcha.com';

    // Submit captcha task
    const submitParams: any = {
      key: this.apiKey,
      method,
      googlekey: siteKey,
      pageurl: pageUrl,
      json: 1,
    };

    if (action) {
      submitParams.action = action;
    }

    const submitResponse = await axios.get(`${baseUrl}/in.php`, {
      params: submitParams,
    });

    if (submitResponse.data.status !== 1) {
      throw new Error(`2Captcha submission failed: ${submitResponse.data.request}`);
    }

    const taskId = submitResponse.data.request;
    this.logger.debug(`2Captcha task submitted: ${taskId}`);

    // Poll for solution
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    while (attempts < maxAttempts) {
      await this.delay(5000); // Wait 5 seconds

      const resultResponse = await axios.get(`${baseUrl}/res.php`, {
        params: {
          key: this.apiKey,
          action: 'get',
          id: taskId,
          json: 1,
        },
      });

      if (resultResponse.data.status === 1) {
        this.logger.log(`2Captcha solved successfully`);
        return {
          solution: resultResponse.data.request,
          solvedAt: new Date(),
          service: '2captcha',
        };
      }

      if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha error: ${resultResponse.data.request}`);
      }

      attempts++;
    }

    throw new Error('2Captcha timeout: solution not received');
  }

  /**
   * Solve using AntiCaptcha service
   */
  private async solveAntiCaptcha(
    siteKey: string,
    pageUrl: string,
    type: string,
    action?: string,
  ): Promise<CaptchaSolution> {
    const baseUrl = 'https://api.anti-captcha.com';

    // Create task
    const task: any = {
      type,
      websiteURL: pageUrl,
      websiteKey: siteKey,
    };

    if (action) {
      task.pageAction = action;
    }

    const createTaskResponse = await axios.post(`${baseUrl}/createTask`, {
      clientKey: this.apiKey,
      task,
    });

    if (createTaskResponse.data.errorId > 0) {
      throw new Error(`AntiCaptcha error: ${createTaskResponse.data.errorDescription}`);
    }

    const taskId = createTaskResponse.data.taskId;
    this.logger.debug(`AntiCaptcha task created: ${taskId}`);

    // Poll for solution
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      await this.delay(5000);

      const resultResponse = await axios.post(`${baseUrl}/getTaskResult`, {
        clientKey: this.apiKey,
        taskId,
      });

      if (resultResponse.data.status === 'ready') {
        this.logger.log(`AntiCaptcha solved successfully`);
        return {
          solution: resultResponse.data.solution.gRecaptchaResponse,
          solvedAt: new Date(),
          service: 'anticaptcha',
        };
      }

      if (resultResponse.data.errorId > 0) {
        throw new Error(`AntiCaptcha error: ${resultResponse.data.errorDescription}`);
      }

      attempts++;
    }

    throw new Error('AntiCaptcha timeout: solution not received');
  }

  /**
   * Manual solving fallback (requires human intervention)
   */
  private async solveManually(
    captchaType: string,
    siteKey: string,
    pageUrl: string,
  ): Promise<CaptchaSolution> {
    this.logger.warn(
      `Manual CAPTCHA solving required: ${captchaType} on ${pageUrl}`,
    );

    // In production, this would trigger a notification or queue
    // For now, throw an error to indicate manual intervention needed
    throw new Error(
      `Manual CAPTCHA solving required. Configure CAPTCHA_API_KEY and CAPTCHA_SERVICE in .env`,
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if CAPTCHA service is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.service !== 'manual');
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      service: this.service,
      isConfigured: this.isConfigured(),
      apiKeyPresent: !!this.apiKey,
    };
  }
}
