import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class GeneratePostDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsEnum(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'general'])
  platform?: string;

  @IsOptional()
  @IsEnum(['professional', 'casual', 'friendly', 'humorous', 'formal'])
  tone?: 'professional' | 'casual' | 'friendly' | 'humorous' | 'formal';

  @IsOptional()
  @IsEnum(['short', 'medium', 'long'])
  length?: 'short' | 'medium' | 'long';

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  includeHashtags?: boolean;

  @IsOptional()
  @IsBoolean()
  includeEmojis?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxHashtags?: number;
}

export class GenerateVariationsDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  count?: number;

  @IsOptional()
  @IsEnum(['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'general'])
  platform?: string;

  @IsOptional()
  @IsEnum(['professional', 'casual', 'friendly', 'humorous', 'formal'])
  tone?: string;
}

export class GenerateHashtagsDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  count?: number;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class GenerateImageDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsEnum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
  size?: string;

  @IsOptional()
  @IsEnum(['standard', 'hd'])
  quality?: 'standard' | 'hd';

  @IsOptional()
  @IsEnum(['vivid', 'natural'])
  style?: 'vivid' | 'natural';
}

export class GenerateCaptionDto {
  @IsString()
  imageDescription: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsEnum(['professional', 'casual', 'friendly', 'humorous', 'formal'])
  tone?: string;

  @IsOptional()
  @IsBoolean()
  includeHashtags?: boolean;
}

export class TranslateTextDto {
  @IsString()
  text: string;

  @IsString()
  targetLanguage: string;
}

export class ImproveContentDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvements?: string[];
}

export class GenerateFromTemplateDto {
  @IsString()
  template: string;

  @IsOptional()
  variables?: Record<string, string>;
}

export class GetSuggestionsDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  count?: number;
}
