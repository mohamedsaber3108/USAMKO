import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  private bedrockClient: any = null;
  private readonly isConfigured: boolean;
  private readonly isDemoMode: boolean;
  private readonly awsRegion: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    this.awsRegion = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    // Detect placeholder/missing credentials
    const placeholderPatterns = [
      'your-aws-key', 'your-aws-secret', 'placeholder',
      'CHANGE_ME', 'xxx', 'your-key', 'your-secret',
    ];
    const hasPlaceholderCreds =
      !accessKeyId ||
      !secretAccessKey ||
      placeholderPatterns.some(p => accessKeyId.toLowerCase().includes(p.toLowerCase())) ||
      placeholderPatterns.some(p => secretAccessKey.toLowerCase().includes(p.toLowerCase()));

    this.isDemoMode = hasPlaceholderCreds;
    this.isConfigured = true; // Always "configured" - demo mode serves as fallback

    if (this.isDemoMode) {
      this.logger.warn(
        'AWS credentials are placeholders - running in DEMO MODE with generated sample content',
      );
    } else {
      this.initBedrockClient(accessKeyId, secretAccessKey);
    }
  }

  private async initBedrockClient(accessKeyId: string, secretAccessKey: string) {
    try {
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      this.bedrockClient = new BedrockRuntimeClient({
        region: this.awsRegion,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`AWS Bedrock client initialized (region: ${this.awsRegion})`);
    } catch (error) {
      this.logger.error(`Failed to initialize Bedrock client: ${error.message}`);
      this.logger.warn('Falling back to demo mode');
    }
  }

  /**
   * Check if AI service is available (always true - demo mode is the fallback)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Check if running in demo mode
   */
  isDemo(): boolean {
    return this.isDemoMode || !this.bedrockClient;
  }

  /**
   * Call AWS Bedrock Claude model
   */
  private async callBedrock(prompt: string, systemPrompt?: string, temperature = 0.7, maxTokens = 500): Promise<string> {
    if (this.isDemo()) {
      return null; // Signal to use demo content
    }

    try {
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

      const messages: any[] = [{ role: 'user', content: prompt }];

      const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt || 'You are a helpful AI assistant.',
        messages,
      });

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(body),
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return responseBody.content?.[0]?.text || '';
    } catch (error) {
      this.logger.error(`Bedrock call failed: ${error.message}`);
      // Fall through to demo content instead of crashing
      return null;
    }
  }

  /**
   * Generate social media post content
   */
  async generatePost(
    topic: string,
    options: ContentGenerationOptions = {},
  ): Promise<GeneratedContent> {
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

    const systemPrompt = 'You are a professional social media content creator. Create engaging, high-quality posts that drive engagement.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.8, 500);

      if (response) {
        // Parse real AI response
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

        if (!text) {
          text = response;
          const hashtagMatches = text.match(/#\w+/g);
          if (hashtagMatches) {
            hashtags = hashtagMatches.slice(0, maxHashtags);
          }
        }

        return { text, hashtags };
      }

      // Demo mode response
      return this.generateDemoPost(topic, options);
    } catch (error) {
      this.logger.error(`Failed to generate post: ${error.message}`);
      // Never crash - return demo content
      return this.generateDemoPost(topic, options);
    }
  }

  /**
   * Generate demo post content when AI is unavailable
   */
  private generateDemoPost(topic: string, options: ContentGenerationOptions = {}): GeneratedContent {
    const { platform = 'general', tone = 'casual', maxHashtags = 5, includeHashtags = true } = options;

    const toneTemplates: Record<string, string[]> = {
      professional: [
        `Excited to share insights on ${topic}. In today's fast-paced world, staying ahead means embracing innovation and continuous learning.`,
        `${topic} is transforming how we work. Here are the key takeaways from our latest research and implementation experience.`,
        `The future of ${topic} is here. Organizations that adapt early will lead the next wave of industry transformation.`,
      ],
      casual: [
        `Just discovered something amazing about ${topic}! Can't wait to share more with you all.`,
        `Anyone else obsessed with ${topic} lately? Here's what I've been learning...`,
        `Hot take: ${topic} is going to change everything. Here's why I'm all in.`,
      ],
      friendly: [
        `Hey friends! Let's talk about ${topic} - I think you'll love what I've found.`,
        `Happy to share my journey with ${topic}! It's been incredible so far.`,
        `Want to know a secret about ${topic}? Let me share what's been working for me!`,
      ],
      humorous: [
        `Me before ${topic}: confused. Me after ${topic}: still confused but with better hashtags.`,
        `Plot twist: ${topic} is actually easier than making instant noodles. (OK maybe not, but close!)`,
        `Breaking news: Local person discovers ${topic} and won't stop talking about it. Story at 11.`,
      ],
      formal: [
        `We are pleased to present our findings regarding ${topic}. The implications for industry stakeholders are significant.`,
        `An in-depth analysis of ${topic} reveals compelling opportunities for strategic growth and development.`,
        `${topic} represents a paradigm shift in our approach to modern challenges and operational excellence.`,
      ],
    };

    const templates = toneTemplates[tone] || toneTemplates['casual'];
    const text = templates[Math.floor(Math.random() * templates.length)];

    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const genericHashtags = ['#innovation', '#growth', '#trending', '#viral', '#mustread', '#inspo', '#gamechanging', '#mindblown'];
    const topicHashtags = topicWords.slice(0, 3).map(w => `#${w}`);
    const hashtags = includeHashtags
      ? [...topicHashtags, ...genericHashtags].slice(0, maxHashtags)
      : [];

    return {
      text,
      hashtags,
      callToAction: 'What are your thoughts? Share below!',
      variations: [
        templates[(Math.floor(Math.random() * templates.length) + 1) % templates.length],
      ],
    };
  }

  /**
   * Generate multiple post variations
   */
  async generatePostVariations(
    topic: string,
    count: number = 3,
    options: ContentGenerationOptions = {},
  ): Promise<string[]> {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.generatePost(topic, options);
      variations.push(result.text);
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
    let prompt = `Generate ${count} relevant and popular hashtags for: ${topic}\n\n`;
    if (platform) {
      prompt += `Platform: ${platform}\n`;
    }
    prompt += 'Return only the hashtags, one per line, with # prefix.';

    const systemPrompt = 'You are a social media hashtag expert. Generate relevant, trending hashtags that maximize reach and engagement.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.7, 200);

      if (response) {
        const hashtags = response
          .split('\n')
          .map(h => h.trim())
          .filter(h => h.startsWith('#'))
          .slice(0, count);
        return hashtags;
      }

      // Demo mode hashtags
      return this.generateDemoHashtags(topic, count);
    } catch (error) {
      this.logger.error(`Failed to generate hashtags: ${error.message}`);
      return this.generateDemoHashtags(topic, count);
    }
  }

  /**
   * Generate demo hashtags
   */
  private generateDemoHashtags(topic: string, count: number): string[] {
    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const topicTags = topicWords.map(w => `#${w.replace(/[^a-z0-9]/g, '')}`);
    const generic = [
      '#trending', '#viral', '#explore', '#fyp', '#discover',
      '#inspo', '#lifestyle', '#creative', '#content', '#growth',
      '#engagement', '#community', '#digital', '#strategy', '#success',
    ];
    const combined = [...topicTags, ...generic];
    // Deduplicate and limit
    return [...new Set(combined)].slice(0, count);
  }

  /**
   * Generate image (returns placeholder in demo mode since Bedrock doesn't do images directly)
   */
  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<{ url: string; revisedPrompt?: string }[]> {
    const { prompt, size = '1024x1024', n = 1 } = options;

    // Even with real credentials, image generation via Bedrock uses Stability AI or Titan
    // For now, return a useful placeholder
    this.logger.log(`Image generation requested: "${prompt}" (${size})`);

    const [width, height] = size.split('x').map(Number);
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 60));

    const results = [];
    for (let i = 0; i < Math.min(n, 4); i++) {
      results.push({
        url: `https://placehold.co/${width}x${height}/1a1a2e/e0e0e0?text=${encodedPrompt}`,
        revisedPrompt: `[Demo] ${prompt}`,
      });
    }

    return results;
  }

  /**
   * Generate caption for an image
   */
  async generateCaption(
    imageDescription: string,
    options: ContentGenerationOptions = {},
  ): Promise<string> {
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

    const systemPrompt = 'You are a creative caption writer for social media posts.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.8, 300);

      if (response) {
        return response;
      }

      // Demo caption
      return this.generateDemoCaption(imageDescription, options);
    } catch (error) {
      this.logger.error(`Failed to generate caption: ${error.message}`);
      return this.generateDemoCaption(imageDescription, options);
    }
  }

  private generateDemoCaption(imageDescription: string, options: ContentGenerationOptions = {}): string {
    const { includeHashtags = true, maxHashtags = 5 } = options;
    const captions = [
      `Captured this moment perfectly. ${imageDescription} - sometimes the best stories are told through images.`,
      `There's beauty in every frame. ${imageDescription} speaks for itself.`,
      `A picture is worth a thousand words, but this one about ${imageDescription} deserves a few more.`,
    ];
    let caption = captions[Math.floor(Math.random() * captions.length)];
    if (includeHashtags) {
      const tags = this.generateDemoHashtags(imageDescription, maxHashtags);
      caption += '\n\n' + tags.join(' ');
    }
    return caption;
  }

  /**
   * Translate text to another language
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage}. Maintain the tone, style, and any hashtags or emojis:\n\n${text}`;
    const systemPrompt = `You are a professional translator. Translate to ${targetLanguage} accurately.`;

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.3, 500);

      if (response) {
        return response;
      }

      // Demo translation notice
      return `[Demo - ${targetLanguage} translation] ${text}`;
    } catch (error) {
      this.logger.error(`Failed to translate text: ${error.message}`);
      return `[Translation unavailable - ${targetLanguage}] ${text}`;
    }
  }

  /**
   * Improve existing content
   */
  async improveContent(
    text: string,
    improvements: string[] = ['clarity', 'engagement'],
  ): Promise<string> {
    const improvementList = improvements.join(', ');
    const prompt = `Improve the following text focusing on: ${improvementList}\n\n${text}`;
    const systemPrompt = `You are a content improvement expert. Focus on: ${improvementList}`;

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.7, 500);

      if (response) {
        return response;
      }

      // Demo improvement
      return this.generateDemoImprovement(text, improvements);
    } catch (error) {
      this.logger.error(`Failed to improve content: ${error.message}`);
      return this.generateDemoImprovement(text, improvements);
    }
  }

  private generateDemoImprovement(text: string, improvements: string[]): string {
    // Simple demo enhancement - add polish to the existing text
    let improved = text.trim();
    if (improvements.includes('engagement') && !improved.endsWith('?') && !improved.endsWith('!')) {
      improved += ' What do you think?';
    }
    if (improvements.includes('clarity')) {
      // Just return the text cleaner
      improved = improved.replace(/\s+/g, ' ').trim();
    }
    return improved;
  }

  /**
   * Generate content from template
   */
  async generateFromTemplate(
    template: string,
    variables: Record<string, string>,
  ): Promise<string> {
    let prompt = `Fill in this template with the provided information:\n\n`;
    prompt += `Template: ${template}\n\n`;
    prompt += `Information:\n`;
    for (const [key, value] of Object.entries(variables)) {
      prompt += `${key}: ${value}\n`;
    }
    prompt += '\nProvide only the filled template, nothing else.';

    const systemPrompt = 'You are a content generator. Fill templates with provided information.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.5, 500);

      if (response) {
        return response;
      }

      // Demo template fill
      let filled = template;
      for (const [key, value] of Object.entries(variables)) {
        filled = filled.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
        filled = filled.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
      }
      return filled;
    } catch (error) {
      this.logger.error(`Failed to generate from template: ${error.message}`);
      let filled = template;
      for (const [key, value] of Object.entries(variables)) {
        filled = filled.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
        filled = filled.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
      }
      return filled;
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
    const prompt = `Analyze the sentiment of this text and return a JSON object with: sentiment (positive/negative/neutral), confidence (0-1), and emotions (array of detected emotions).\n\nText: ${text}`;
    const systemPrompt = 'Analyze sentiment. Return only valid JSON with keys: sentiment, confidence, emotions.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.3, 200);

      if (response) {
        try {
          return JSON.parse(response);
        } catch {
          // If parsing fails, do basic analysis
        }
      }

      // Demo sentiment analysis
      return this.generateDemoSentiment(text);
    } catch (error) {
      this.logger.error(`Failed to analyze sentiment: ${error.message}`);
      return this.generateDemoSentiment(text);
    }
  }

  private generateDemoSentiment(text: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    emotions: string[];
  } {
    const positiveWords = ['great', 'amazing', 'love', 'excellent', 'happy', 'awesome', 'fantastic', 'wonderful', 'good', 'best'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'disappointing', 'sad', 'angry', 'poor'];

    const lowerText = text.toLowerCase();
    const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negCount = negativeWords.filter(w => lowerText.includes(w)).length;

    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;
    let emotions: string[];

    if (posCount > negCount) {
      sentiment = 'positive';
      confidence = Math.min(0.6 + posCount * 0.1, 0.95);
      emotions = ['joy', 'enthusiasm'];
    } else if (negCount > posCount) {
      sentiment = 'negative';
      confidence = Math.min(0.6 + negCount * 0.1, 0.95);
      emotions = ['frustration', 'concern'];
    } else {
      sentiment = 'neutral';
      confidence = 0.65;
      emotions = ['calm', 'informative'];
    }

    return { sentiment, confidence, emotions };
  }

  /**
   * Get content suggestions based on topic
   */
  async getSuggestions(
    topic: string,
    count: number = 5,
  ): Promise<string[]> {
    const prompt = `Generate ${count} creative post ideas about: ${topic}\n\nReturn only the ideas, one per line.`;
    const systemPrompt = 'You are a content strategist. Generate creative post ideas.';

    try {
      const response = await this.callBedrock(prompt, systemPrompt, 0.9, 400);

      if (response) {
        return response.split('\n').filter(line => line.trim()).slice(0, count);
      }

      // Demo suggestions
      return this.generateDemoSuggestions(topic, count);
    } catch (error) {
      this.logger.error(`Failed to get suggestions: ${error.message}`);
      return this.generateDemoSuggestions(topic, count);
    }
  }

  private generateDemoSuggestions(topic: string, count: number): string[] {
    const templates = [
      `Share a behind-the-scenes look at your ${topic} process`,
      `Create a "day in the life" post focused on ${topic}`,
      `Post a quick tip or hack related to ${topic}`,
      `Share a success story or milestone about ${topic}`,
      `Ask your audience a question about ${topic}`,
      `Create a comparison or "before and after" about ${topic}`,
      `Share an inspiring quote related to ${topic}`,
      `Post a tutorial or step-by-step guide about ${topic}`,
      `Highlight a common myth vs reality about ${topic}`,
      `Create a list of top resources for ${topic}`,
    ];

    // Shuffle and take count
    const shuffled = templates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
