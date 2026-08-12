import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ContentGenerationOptions {
  platform?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'humorous' | 'formal';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  keywords?: string[];
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  maxHashtags?: number;
}

export interface GeneratedContent {
  text: string;
  hashtags?: string[];
  caption?: string;
  callToAction?: string;
  variations?: string[];
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.isConfigured = !!apiKey;

    if (this.isConfigured) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI service initialized');
    } else {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  /**
   * Check if AI service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate social media post content
   */
  async generatePost(
    topic: string,
    options: ContentGenerationOptions = {},
  ): Promise<GeneratedContent> {
    this.ensureConfigured();

    const {
      platform = 'general',
      tone = 'casual',
      length = 'medium',
      language = 'en',
      keywords = [],
      includeHashtags = true,
      includeEmojis = true,
      maxHashtags = 5,
    } = options;

    // Build prompt
    let prompt = `Write a ${tone} social media post about: ${topic}\n\n`;
    prompt += `Platform: ${platform}\n`;
    prompt += `Length: ${length}\n`;
    prompt += `Language: ${language}\n`;

    if (keywords.length > 0) {
      prompt += `Include these keywords: ${keywords.join(', ')}\n`;
    }

    if (includeHashtags) {
      prompt += `Include ${maxHashtags} relevant hashtags at the end\n`;
    }

    if (includeEmojis) {
      prompt += `Use appropriate emojis\n`;
    }

    // Platform-specific guidelines
    const platformGuidelines: Record<string, string> = {
      twitter: 'Keep it under 280 characters.',
      facebook: 'Make it engaging and conversational.',
      instagram: 'Focus on visual appeal and lifestyle.',
      linkedin: 'Make it professional and value-focused.',
      tiktok: 'Make it trendy and attention-grabbing.',
    };

    if (platformGuidelines[platform]) {
      prompt += `\n${platformGuidelines[platform]}\n`;
    }

    prompt += '\nProvide the post in this format:\nMain text:\n[post content]\n\nHashtags:\n[hashtags separated by spaces]';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional social media content creator. Create engaging, high-quality posts that drive engagement.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || '';

      // Parse response
      const parts = response.split('\n\n');
      let text = '';
      let hashtags: string[] = [];

      for (const part of parts) {
        if (part.startsWith('Main text:')) {
          text = part.replace('Main text:', '').trim();
        } else if (part.startsWith('Hashtags:')) {
          const hashtagText = part.replace('Hashtags:', '').trim();
          hashtags = hashtagText.split(' ').filter(h => h.startsWith('#'));
        }
      }

      // If parsing failed, use full response
      if (!text) {
        text = response;
        // Extract hashtags from text
        const hashtagMatches = text.match(/#\w+/g);
        if (hashtagMatches) {
          hashtags = hashtagMatches.slice(0, maxHashtags);
        }
      }

      return {
        text,
        hashtags,
      };
    } catch (error) {
      this.logger.error(`Failed to generate post: ${error.message}`);
      throw new BadRequestException('Failed to generate content');
    }
  }

  /**
   * Generate multiple post variations
   */
  async generatePostVariations(
    topic: string,
    count: number = 3,
    options: ContentGenerationOptions = {},
  ): Promise<string[]> {
    this.ensureConfigured();

    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.generatePost(topic, {
        ...options,
        // Vary temperature for different results
      });
      variations.push(result.text);

      // Small delay to avoid rate limiting
      await this.delay(500);
    }

    return variations;
  }

  /**
   * Generate hashtags for a topic
   */
  async generateHashtags(
    topic: string,
    count: number = 10,
    platform?: string,
  ): Promise<string[]> {
    this.ensureConfigured();

    let prompt = `Generate ${count} relevant and popular hashtags for: ${topic}\n\n`;

    if (platform) {
      prompt += `Platform: ${platform}\n`;
    }

    prompt += 'Return only the hashtags, one per line, with # prefix.';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a social media hashtag expert. Generate relevant, trending hashtags that maximize reach and engagement.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content || '';
      const hashtags = response
        .split('\n')
        .map(h => h.trim())
        .filter(h => h.startsWith('#'))
        .slice(0, count);

      return hashtags;
    } catch (error) {
      this.logger.error(`Failed to generate hashtags: ${error.message}`);
      throw new BadRequestException('Failed to generate hashtags');
    }
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<{ url: string; revisedPrompt?: string }[]> {
    this.ensureConfigured();

    const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid', n = 1 } = options;

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size,
        quality,
        style,
        n: Math.min(n, 1), // DALL-E 3 supports n=1 only
      });

      return (response.data as any[]).map(img => ({
        url: img.url,
        revisedPrompt: img.revised_prompt,
      }));
    } catch (error) {
      this.logger.error(`Failed to generate image: ${error.message}`);
      throw new BadRequestException('Failed to generate image');
    }
  }

  /**
   * Generate caption for an image
   */
  async generateCaption(
    imageDescription: string,
    options: ContentGenerationOptions = {},
  ): Promise<string> {
    this.ensureConfigured();

    const {
      platform = 'general',
      tone = 'casual',
      language = 'en',
      includeHashtags = true,
      maxHashtags = 5,
    } = options;

    let prompt = `Write an engaging ${tone} caption for an image showing: ${imageDescription}\n\n`;
    prompt += `Platform: ${platform}\n`;
    prompt += `Language: ${language}\n`;

    if (includeHashtags) {
      prompt += `Include ${maxHashtags} relevant hashtags\n`;
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a creative caption writer for social media posts.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Failed to generate caption: ${error.message}`);
      throw new BadRequestException('Failed to generate caption');
    }
  }

  /**
   * Translate text to another language
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    this.ensureConfigured();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${targetLanguage}. Maintain the tone, style, and any hashtags or emojis.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      this.logger.error(`Failed to translate text: ${error.message}`);
      throw new BadRequestException('Failed to translate text');
    }
  }

  /**
   * Improve existing content
   */
  async improveContent(
    text: string,
    improvements: string[] = ['clarity', 'engagement'],
  ): Promise<string> {
    this.ensureConfigured();

    const improvementList = improvements.join(', ');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a content improvement expert. Improve the following text focusing on: ${improvementList}`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      this.logger.error(`Failed to improve content: ${error.message}`);
      throw new BadRequestException('Failed to improve content');
    }
  }

  /**
   * Generate content from template
   */
  async generateFromTemplate(
    template: string,
    variables: Record<string, string>,
  ): Promise<string> {
    this.ensureConfigured();

    let prompt = `Fill in this template with the provided information:\n\n`;
    prompt += `Template: ${template}\n\n`;
    prompt += `Information:\n`;

    for (const [key, value] of Object.entries(variables)) {
      prompt += `${key}: ${value}\n`;
    }

    prompt += '\nProvide only the filled template, nothing else.';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a content generator. Fill templates with provided information.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Failed to generate from template: ${error.message}`);
      throw new BadRequestException('Failed to generate content from template');
    }
  }

  /**
   * Analyze content sentiment
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: string[];
  }> {
    this.ensureConfigured();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Analyze the sentiment of the text. Return a JSON object with: sentiment (positive/negative/neutral), confidence (0-1), and emotions (array of detected emotions).',
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content || '{}';
      return JSON.parse(response);
    } catch (error) {
      this.logger.error(`Failed to analyze sentiment: ${error.message}`);
      return { sentiment: 'neutral', confidence: 0, emotions: [] };
    }
  }

  /**
   * Get content suggestions based on topic
   */
  async getSuggestions(
    topic: string,
    count: number = 5,
  ): Promise<string[]> {
    this.ensureConfigured();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a content strategist. Generate creative post ideas.',
          },
          {
            role: 'user',
            content: `Generate ${count} creative post ideas about: ${topic}\n\nReturn only the ideas, one per line.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 400,
      });

      const response = completion.choices[0]?.message?.content || '';
      return response.split('\n').filter(line => line.trim()).slice(0, count);
    } catch (error) {
      this.logger.error(`Failed to get suggestions: ${error.message}`);
      throw new BadRequestException('Failed to get suggestions');
    }
  }

  /**
   * Ensure OpenAI is configured
   */
  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'AI service not configured. Please set OPENAI_API_KEY in environment variables.',
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
