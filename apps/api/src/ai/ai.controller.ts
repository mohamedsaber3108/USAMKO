import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import {
  GeneratePostDto,
  GenerateVariationsDto,
  GenerateHashtagsDto,
  GenerateImageDto,
  GenerateCaptionDto,
  TranslateTextDto,
  ImproveContentDto,
  GenerateFromTemplateDto,
  GetSuggestionsDto,
} from './dto/generate-content.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Check if AI service is available
   */
  @Get('status')
  getStatus() {
    return {
      available: this.aiService.isAvailable(),
      provider: 'OpenAI',
      models: ['gpt-4', 'dall-e-3'],
    };
  }

  /**
   * Generate social media post
   */
  @Post('generate/post')
  @HttpCode(HttpStatus.OK)
  async generatePost(@Body() dto: GeneratePostDto) {
    const result = await this.aiService.generatePost(dto.topic, {
      platform: dto.platform,
      tone: dto.tone,
      length: dto.length,
      language: dto.language,
      keywords: dto.keywords,
      includeHashtags: dto.includeHashtags,
      includeEmojis: dto.includeEmojis,
      maxHashtags: dto.maxHashtags,
    });

    return {
      ...result,
      provider: 'OpenAI GPT-4',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate multiple post variations
   */
  @Post('generate/variations')
  @HttpCode(HttpStatus.OK)
  async generateVariations(@Body() dto: GenerateVariationsDto) {
    const variations = await this.aiService.generatePostVariations(
      dto.topic,
      dto.count || 3,
      {
        platform: dto.platform,
        tone: dto.tone as any,
      },
    );

    return {
      topic: dto.topic,
      variations,
      count: variations.length,
    };
  }

  /**
   * Generate hashtags
   */
  @Post('generate/hashtags')
  @HttpCode(HttpStatus.OK)
  async generateHashtags(@Body() dto: GenerateHashtagsDto) {
    const hashtags = await this.aiService.generateHashtags(
      dto.topic,
      dto.count || 10,
      dto.platform,
    );

    return {
      topic: dto.topic,
      hashtags,
      count: hashtags.length,
    };
  }

  /**
   * Generate image using DALL-E
   */
  @Post('generate/image')
  @HttpCode(HttpStatus.OK)
  async generateImage(@Body() dto: GenerateImageDto) {
    const images = await this.aiService.generateImage({
      prompt: dto.prompt,
      size: dto.size as any,
      quality: dto.quality,
      style: dto.style,
      n: 1,
    });

    return {
      prompt: dto.prompt,
      images,
      model: 'DALL-E 3',
    };
  }

  /**
   * Generate caption for image
   */
  @Post('generate/caption')
  @HttpCode(HttpStatus.OK)
  async generateCaption(@Body() dto: GenerateCaptionDto) {
    const caption = await this.aiService.generateCaption(
      dto.imageDescription,
      {
        platform: dto.platform,
        tone: dto.tone as any,
        includeHashtags: dto.includeHashtags,
      },
    );

    return {
      imageDescription: dto.imageDescription,
      caption,
    };
  }

  /**
   * Translate text
   */
  @Post('translate')
  @HttpCode(HttpStatus.OK)
  async translateText(@Body() dto: TranslateTextDto) {
    const translatedText = await this.aiService.translateText(
      dto.text,
      dto.targetLanguage,
    );

    return {
      originalText: dto.text,
      translatedText,
      targetLanguage: dto.targetLanguage,
    };
  }

  /**
   * Improve existing content
   */
  @Post('improve')
  @HttpCode(HttpStatus.OK)
  async improveContent(@Body() dto: ImproveContentDto) {
    const improvedText = await this.aiService.improveContent(
      dto.text,
      dto.improvements || ['clarity', 'engagement'],
    );

    return {
      originalText: dto.text,
      improvedText,
      improvements: dto.improvements || ['clarity', 'engagement'],
    };
  }

  /**
   * Generate from template
   */
  @Post('generate/template')
  @HttpCode(HttpStatus.OK)
  async generateFromTemplate(@Body() dto: GenerateFromTemplateDto) {
    const content = await this.aiService.generateFromTemplate(
      dto.template,
      dto.variables || {},
    );

    return {
      template: dto.template,
      variables: dto.variables,
      content,
    };
  }

  /**
   * Get content suggestions
   */
  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(@Body() dto: GetSuggestionsDto) {
    const suggestions = await this.aiService.getSuggestions(
      dto.topic,
      dto.count || 5,
    );

    return {
      topic: dto.topic,
      suggestions,
      count: suggestions.length,
    };
  }

  /**
   * Analyze sentiment
   */
  @Post('analyze/sentiment')
  @HttpCode(HttpStatus.OK)
  async analyzeSentiment(@Body('text') text: string) {
    const analysis = await this.aiService.analyzeSentiment(text);

    return {
      text,
      ...analysis,
    };
  }
}
