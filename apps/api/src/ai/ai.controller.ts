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
import { BedrockService } from './bedrock.service';
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
  constructor(private readonly bedrock: BedrockService) {}

  @Get('status')
  getStatus() {
    return {
      available: this.bedrock.isAvailable(),
      provider: 'AWS Bedrock',
      models: ['anthropic.claude-3-5-sonnet'],
    };
  }

  @Post('generate/post')
  @HttpCode(HttpStatus.OK)
  async generatePost(@Body() dto: GeneratePostDto) {
    const content = await this.bedrock.generatePost({
      topic: dto.topic,
      platform: dto.platform || 'linkedin',
      tone: dto.tone as any,
      length: dto.length as any,
      includeHashtags: dto.includeHashtags,
    });

    return {
      content,
      provider: 'AWS Bedrock (Claude)',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('generate/variations')
  @HttpCode(HttpStatus.OK)
  async generateVariations(@Body() dto: GenerateVariationsDto) {
    const variations = await this.bedrock.generateVariations(
      `Write a ${dto.tone || 'professional'} social media post about: ${dto.topic}. Platform: ${dto.platform || 'linkedin'}`,
      dto.count || 3,
    );

    return {
      topic: dto.topic,
      variations,
      count: variations.length,
    };
  }

  @Post('generate/hashtags')
  @HttpCode(HttpStatus.OK)
  async generateHashtags(@Body() dto: GenerateHashtagsDto) {
    const hashtags = await this.bedrock.generateHashtags(
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

  @Post('generate/image')
  @HttpCode(HttpStatus.OK)
  async generateImage(@Body() dto: GenerateImageDto) {
    return {
      prompt: dto.prompt,
      images: [],
      model: 'Not available (Bedrock does not support image generation via this endpoint)',
    };
  }

  @Post('generate/caption')
  @HttpCode(HttpStatus.OK)
  async generateCaption(@Body() dto: GenerateCaptionDto) {
    const response = await this.bedrock.generateMessage({
      prompt: `Write a ${dto.tone || 'engaging'} social media caption for an image described as: "${dto.imageDescription}". Platform: ${dto.platform || 'instagram'}. ${dto.includeHashtags ? 'Include relevant hashtags.' : 'No hashtags.'}. Return ONLY the caption.`,
      maxTokens: 300,
      temperature: 0.8,
    });

    return {
      imageDescription: dto.imageDescription,
      caption: response.content,
    };
  }

  @Post('translate')
  @HttpCode(HttpStatus.OK)
  async translateText(@Body() dto: TranslateTextDto) {
    const translatedText = await this.bedrock.translateText(
      dto.text,
      dto.targetLanguage,
    );

    return {
      originalText: dto.text,
      translatedText,
      targetLanguage: dto.targetLanguage,
    };
  }

  @Post('improve')
  @HttpCode(HttpStatus.OK)
  async improveContent(@Body() dto: ImproveContentDto) {
    const improvedText = await this.bedrock.improveContent(
      dto.text,
      dto.improvements || ['clarity', 'engagement'],
    );

    return {
      originalText: dto.text,
      improvedText,
      improvements: dto.improvements || ['clarity', 'engagement'],
    };
  }

  @Post('generate/template')
  @HttpCode(HttpStatus.OK)
  async generateFromTemplate(@Body() dto: GenerateFromTemplateDto) {
    const vars = dto.variables || {};
    const filledTemplate = Object.entries(vars).reduce(
      (tmpl, [key, val]) => tmpl.replace(new RegExp(`{{${key}}}`, 'g'), val),
      dto.template,
    );

    const response = await this.bedrock.generateMessage({
      prompt: `Expand and improve this message template into a complete, polished message:\n\n${filledTemplate}\n\nReturn ONLY the final message.`,
      maxTokens: 500,
      temperature: 0.7,
    });

    return {
      template: dto.template,
      variables: dto.variables,
      content: response.content,
    };
  }

  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  async getSuggestions(@Body() dto: GetSuggestionsDto) {
    const response = await this.bedrock.generateMessage({
      prompt: `Suggest ${dto.count || 5} creative social media content ideas about: ${dto.topic}. Return each suggestion on a new line, numbered.`,
      maxTokens: 500,
      temperature: 0.9,
    });

    const suggestions = response.content
      .split('\n')
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(s => s.length > 0);

    return {
      topic: dto.topic,
      suggestions,
      count: suggestions.length,
    };
  }

  @Post('analyze/sentiment')
  @HttpCode(HttpStatus.OK)
  async analyzeSentiment(@Body('text') text: string) {
    const analysis = await this.bedrock.analyzeSentiment(text);

    return {
      text,
      ...analysis,
    };
  }
}
