// DTOs for updating posts

import { IsString, IsOptional, IsEnum, IsUrl, IsObject, IsDate } from 'class-validator';

export class UpdatePostDto {
  /**
   * Updated text content
   */
  @IsOptional()
  @IsString()
  text?: string;

  /**
   * Updated media URL
   */
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  /**
   * Updated media type
   */
  @IsOptional()
  @IsEnum(['image', 'video', 'link', 'carousel'])
  mediaType?: 'image' | 'video' | 'link' | 'carousel';

  /**
   * Updated link
   */
  @IsOptional()
  @IsUrl()
  link?: string;

  /**
   * Updated title
   */
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Updated description
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Updated image
   */
  @IsOptional()
  @IsUrl()
  image?: string;

  /**
   * Updated caption
   */
  @IsOptional()
  @IsString()
  caption?: string;

  /**
   * Updated tags
   */
  @IsOptional()
  @IsObject()
  tags?: Record<string, any>;

  /**
   * Updated location
   */
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Updated metadata
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  /**
   * Updated status
   */
  @IsOptional()
  @IsEnum(['draft', 'published', 'failed'])
  status?: 'draft' | 'published' | 'failed';
}