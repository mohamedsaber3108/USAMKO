import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface BedrockMessageRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface BedrockMessageResponse {
  content: string;
  stopReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * AWS Bedrock Service for Claude AI Integration
 * Uses Claude 3.5 Sonnet for message generation
 */
@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private client: BedrockRuntimeClient;
  private readonly isConfigured: boolean;
  private readonly modelId: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.isConfigured = !!(region && accessKeyId && secretAccessKey);
    this.modelId = this.configService.get<string>(
      'AWS_BEDROCK_MODEL_ID',
      'anthropic.claude-3-5-sonnet-20241022-v2:0'
    );

    if (this.isConfigured) {
      this.client = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`AWS Bedrock service initialized with model: ${this.modelId}`);
    } else {
      this.logger.warn('AWS Bedrock credentials not configured');
    }
  }

  /**
   * Check if Bedrock service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate message using Claude via AWS Bedrock
   */
  async generateMessage(request: BedrockMessageRequest): Promise<BedrockMessageResponse> {
    this.ensureConfigured();

    const {
      prompt,
      maxTokens = 1000,
      temperature = 0.7,
      topP = 1,
      stopSequences = [],
    } = request;

    try {
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        ...(stopSequences.length > 0 && { stop_sequences: stopSequences }),
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      this.logger.debug(`Invoking Bedrock model: ${this.modelId}`);
      const response = await this.client.send(command);

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        content: responseBody.content[0]?.text || '',
        stopReason: responseBody.stop_reason,
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Bedrock API error: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate message: ${error.message}`);
    }
  }

  /**
   * Generate personalized campaign message
   */
  async generateCampaignMessage(params: {
    template: string;
    leadName: string;
    leadCompany?: string;
    leadTitle?: string;
    campaignGoal?: string;
  }): Promise<string> {
    const { template, leadName, leadCompany, leadTitle, campaignGoal } = params;

    const prompt = `You are a professional marketing copywriter. Generate a personalized outreach message based on the following:

Template: ${template}

Lead Information:
- Name: ${leadName}
- ${leadCompany ? `Company: ${leadCompany}` : ''}
- ${leadTitle ? `Title: ${leadTitle}` : ''}

${campaignGoal ? `Campaign Goal: ${campaignGoal}` : ''}

Instructions:
1. Personalize the message using the lead information
2. Keep the tone professional and friendly
3. Make it concise and compelling
4. Include a clear call to action
5. Return ONLY the personalized message, nothing else

Personalized Message:`;

    const response = await this.generateMessage({
      prompt,
      maxTokens: 500,
      temperature: 0.8,
    });

    return response.content.trim();
  }

  /**
   * Generate social media post
   */
  async generatePost(params: {
    topic: string;
    platform: string;
    tone?: 'professional' | 'casual' | 'friendly' | 'humorous';
    length?: 'short' | 'medium' | 'long';
    includeHashtags?: boolean;
  }): Promise<string> {
    const {
      topic,
      platform,
      tone = 'casual',
      length = 'medium',
      includeHashtags = true,
    } = params;

    const lengthGuidelines = {
      short: '50-100 characters',
      medium: '150-200 characters',
      long: '250-300 characters',
    };

    const platformGuidelines: Record<string, string> = {
      twitter: 'Keep it under 280 characters and punchy',
      facebook: 'Make it engaging and conversational',
      instagram: 'Focus on visual appeal and lifestyle',
      linkedin: 'Make it professional and value-focused',
      tiktok: 'Make it trendy and attention-grabbing',
    };

    const prompt = `Write a ${tone} social media post about: ${topic}

Platform: ${platform}
Length: ${lengthGuidelines[length]}
${platformGuidelines[platform] ? `Style: ${platformGuidelines[platform]}` : ''}
${includeHashtags ? 'Include 3-5 relevant hashtags at the end' : 'No hashtags'}

Return ONLY the post content, nothing else.

Post:`;

    const response = await this.generateMessage({
      prompt,
      maxTokens: 300,
      temperature: 0.9,
    });

    return response.content.trim();
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(
    prompt: string,
    count: number = 3,
  ): Promise<string[]> {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      const response = await this.generateMessage({
        prompt,
        temperature: 0.8 + (i * 0.1), // Vary temperature for different results
        maxTokens: 500,
      });

      variations.push(response.content);

      // Small delay to avoid rate limiting
      await this.delay(200);
    }

    return variations;
  }

  /**
   * Improve existing content
   */
  async improveContent(
    text: string,
    improvements: string[] = ['clarity', 'engagement'],
  ): Promise<string> {
    const improvementList = improvements.join(', ');

    const prompt = `Improve the following text focusing on: ${improvementList}

Original text:
${text}

Improved version (return only the improved text):`;

    const response = await this.generateMessage({
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    return response.content.trim();
  }

  /**
   * Translate text
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage}. Maintain the tone, style, and any hashtags or emojis.

Text to translate:
${text}

Translation:`;

    const response = await this.generateMessage({
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    return response.content.trim();
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: string[];
  }> {
    const prompt = `Analyze the sentiment of this text. Return a JSON object with:
- sentiment (positive/negative/neutral)
- confidence (0-1)
- emotions (array of detected emotions)

Text: ${text}

JSON:`;

    const response = await this.generateMessage({
      prompt,
      temperature: 0.3,
      maxTokens: 200,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return { sentiment: 'neutral', confidence: 0, emotions: [] };
    }
  }

  /**
   * Generate hashtags
   */
  async generateHashtags(
    topic: string,
    count: number = 10,
    platform?: string,
  ): Promise<string[]> {
    const prompt = `Generate ${count} relevant and trending hashtags for: ${topic}
${platform ? `Platform: ${platform}` : ''}

Return only the hashtags, one per line, with # prefix.

Hashtags:`;

    const response = await this.generateMessage({
      prompt,
      temperature: 0.7,
      maxTokens: 200,
    });

    const hashtags = response.content
      .split('\n')
      .map(h => h.trim())
      .filter(h => h.startsWith('#'))
      .slice(0, count);

    return hashtags;
  }

  /**
   * Ensure Bedrock is configured
   */
  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'AWS Bedrock not configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in environment variables.',
      );
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
