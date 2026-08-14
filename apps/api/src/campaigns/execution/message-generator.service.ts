import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class MessageGeneratorService {
  private readonly logger = new Logger(MessageGeneratorService.name);
  private openai: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async generateMessage(params: {
    template: string;
    lead: any;
    campaign: any;
    useAI?: boolean;
  }): Promise<string> {
    const { template, lead, campaign, useAI = true } = params;

    // If AI disabled or no API key, use simple template replacement
    if (!useAI || !this.openai) {
      return this.simpleTemplateReplacement(template, lead, campaign);
    }

    try {
      // Use AI for personalization
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional marketing copywriter. Generate a personalized message based on the template and lead information provided. Keep it natural, friendly, and professional. Do not add extra formatting or explanations - just return the message text.`,
          },
          {
            role: 'user',
            content: `Template: ${template}

Lead Information:
- Name: ${lead.fullName || lead.firstName + ' ' + lead.lastName || 'there'}
- Title: ${lead.title || 'N/A'}
- Company: ${lead.company?.name || 'N/A'}
- Location: ${lead.location || 'N/A'}

Campaign: ${campaign.name}
Campaign Type: ${campaign.type}

Generate a personalized message based on this template and lead information. Replace placeholders like {{name}}, {{title}}, {{company}} etc. with actual values and make it sound natural.`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const generatedMessage = completion.choices[0]?.message?.content || template;
      this.logger.debug(`Generated AI message for lead ${lead.id}: ${generatedMessage.substring(0, 100)}...`);
      return generatedMessage;
    } catch (error) {
      this.logger.error(`AI message generation failed: ${error.message}, falling back to template`);
      return this.simpleTemplateReplacement(template, lead, campaign);
    }
  }

  private simpleTemplateReplacement(template: string, lead: any, campaign: any): string {
    const replacements: Record<string, string> = {
      '{{name}}': lead.fullName || lead.firstName || 'there',
      '{{firstName}}': lead.firstName || '',
      '{{lastName}}': lead.lastName || '',
      '{{title}}': lead.title || '',
      '{{company}}': lead.company?.name || '',
      '{{location}}': lead.location || '',
      '{{campaign}}': campaign.name || '',
    };

    let message = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });

    return message;
  }

  async generateBulkMessages(params: {
    template: string;
    leads: any[];
    campaign: any;
    useAI?: boolean;
  }): Promise<Map<string, string>> {
    const { template, leads, campaign, useAI } = params;
    const messages = new Map<string, string>();

    for (const lead of leads) {
      try {
        const message = await this.generateMessage({
          template,
          lead,
          campaign,
          useAI,
        });
        messages.set(lead.id, message);
      } catch (error) {
        this.logger.error(`Failed to generate message for lead ${lead.id}: ${error.message}`);
        messages.set(lead.id, this.simpleTemplateReplacement(template, lead, campaign));
      }
    }

    return messages;
  }
}
