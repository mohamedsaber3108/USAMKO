import { Injectable, BadRequestException } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as aws from '@aws-sdk/client-ses';
import { ConfigService } from '@nestjs/config';

/**
 * Email notification service
 * Supports SendGrid and AWS SES
 */
@Injectable()
export class EmailService {
  private readonly provider: 'sendgrid' | 'ses' | 'smtp';
  private readonly sendgridApiKey?: string;
  private readonly sesConfig?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };

  constructor(private readonly configService: ConfigService) {
    this.provider = (this.configService.get('EMAIL_PROVIDER') as 'sendgrid' | 'ses' | 'smtp') || 'sendgrid';
    this.sendgridApiKey = this.configService.get('SENDGRID_API_KEY');
    
    if (this.provider === 'ses') {
      this.sesConfig = {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        region: this.configService.get('AWS_REGION') || 'us-east-1',
      };
    }
  }

  /**
   * Send an email using the configured provider
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    from?: string,
  ): Promise<boolean> {
    const sender = from || this.configService.get('EMAIL_FROM') || 'noreply@usamko.com';

    try {
      if (this.provider === 'sendgrid') {
        return await this.sendWithSendGrid(to, subject, html, sender);
      } else if (this.provider === 'ses') {
        return await this.sendWithSES(to, subject, html, sender);
      } else {
        return await this.sendWithSMTP(to, subject, html, sender);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendWithSendGrid(
    to: string | string[],
    subject: string,
    html: string,
    from: string,
  ): Promise<boolean> {
    if (!this.sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    sgMail.setApiKey(this.sendgridApiKey);

    const msg = {
      to: Array.isArray(to) ? to : [to],
      from,
      subject,
      html,
    };

    await sgMail.send(msg);
    return true;
  }

  /**
   * Send email using AWS SES
   */
  private async sendWithSES(
    to: string | string[],
    subject: string,
    html: string,
    from: string,
  ): Promise<boolean> {
    if (!this.sesConfig) {
      throw new Error('SES configuration not provided');
    }

    const ses = new aws.SES(this.sesConfig);

    const params: aws.SendEmailRequest = {
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: from,
    };

    await ses.sendEmail(params);
    return true;
  }

  /**
   * Send email using SMTP (fallback)
   */
  private async sendWithSMTP(
    to: string | string[],
    subject: string,
    html: string,
    from: string,
  ): Promise<boolean> {
    // SMTP implementation would go here
    // Using nodemailer or similar
    console.log('SMTP email sending not yet implemented');
    return false;
  }

  /**
   * Send campaign completion email
   */
  async sendCampaignCompleted(
    to: string,
    campaignName: string,
    results: Record<string, any>,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Campaign Completed: ${campaignName}</h2>
        <p>Your campaign has been completed successfully!</p>
        
        <h3 style="color: #333;">Results Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${Object.entries(results).map(([key, value]) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">${key}</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${value}</td>
            </tr>
          `).join('')}
        </table>
        
        <p style="color: #666; font-size: 14px;">
          Thank you for using USAMKO!
        </p>
      </div>
    `;

    return this.sendEmail(to, `Campaign Completed: ${campaignName}`, html);
  }

  /**
   * Send error notification email
   */
  async sendErrorNotification(
    to: string,
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">⚠️ Error Alert</h2>
        <p>An error has occurred in your USAMKO account.</p>
        
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;">
          <h3 style="color: #333; margin: 0 0 8px 0;">Error Details</h3>
          <p style="margin: 0; color: #d32f2f;"><strong>Type:</strong> ${errorType}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Message:</strong> ${errorMessage}</p>
        </div>
        
        ${context ? `
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <h3 style="color: #333; margin: 0 0 8px 0;">Context</h3>
            <pre style="margin: 0; font-size: 12px; color: #666;">${JSON.stringify(context, null, 2)}</pre>
          </div>
        ` : ''}
        
        <p style="color: #666; font-size: 14px;">
          Please review the error details above and take appropriate action.
        </p>
      </div>
    `;

    return this.sendEmail(to, `Error Alert: ${errorType}`, html);
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(
    to: string,
    summary: Record<string, any>,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Weekly Summary</h2>
        <p>Here's what happened with your campaigns this week:</p>
        
        <h3 style="color: #333;">Campaign Performance</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${Object.entries(summary).map(([key, value]) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; color: #666;">${key}</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${value}</td>
            </tr>
          `).join('')}
        </table>
        
        <p style="color: #666; font-size: 14px;">
          Keep up the great work! 🚀
        </p>
      </div>
    `;

    return this.sendEmail(to, 'Weekly Summary', html);
  }
}