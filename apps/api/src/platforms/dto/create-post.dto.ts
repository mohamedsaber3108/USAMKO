// DTOs for creating posts

import { IsString, IsOptional, IsEnum, IsUrl, IsObject, MinLength } from 'class-validator';


export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  LINK = 'link',
  CAROUSEL = 'carousel',
}

export class MediaAttachment {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreatePostDto {
  /**
   * The main text content of the post
   */
  @IsString()
  @MinLength(1)
  text: string;

  /**
   * Optional media URL (image, video, etc.)
   */
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  /**
   * Optional media type
   */
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  /**
   * Optional link to include in the post
   */
  @IsOptional()
  @IsUrl()
  link?: string;

  /**
   * Optional title for link posts
   */
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Optional description for link posts
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Optional image URL
   */
  @IsOptional()
  @IsUrl()
  image?: string;

  /**
   * Optional caption
   */
  @IsOptional()
  @IsString()
  caption?: string;

  /**
   * Optional tags
   */
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  /**
   * Optional location
   */
  @IsOptional()
  @IsString()
  location?: string;

  /**
   * Optional metadata for platform-specific fields
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  /**
   * Whether to publish immediately or save as draft
   */
  @IsOptional()
  @IsString()
  status?: 'draft' | 'published';
}