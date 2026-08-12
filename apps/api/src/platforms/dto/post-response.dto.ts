// DTOs for post responses

import { IsString, IsOptional, IsDate, IsEnum, IsObject } from 'class-validator';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export class PostResponseDto {
  /**
   * Unique identifier for the post
   */
  @IsString()
  id: string;

  /**
   * Post content text
   */
  @IsString()
  content: string;

  /**
   * Optional media URL
   */
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  /**
   * Optional media type
   */
  @IsOptional()
  @IsString()
  mediaType?: string;

  /**
   * Optional published timestamp
   */
  @IsOptional()
  @IsDate()
  publishedAt?: Date;

  /**
   * Post status (draft, published, failed)
   */
  @IsEnum(PostStatus)
  status: PostStatus;

  /**
   * Optional error message if post failed
   */
  @IsOptional()
  @IsString()
  error?: string;

  /**
   * Optional platform-specific ID
   */
  @IsOptional()
  @IsString()
  platformId?: string;

  /**
   * Optional platform post ID
   */
  @IsOptional()
  @IsString()
  platformPostId?: string;

  /**
   * Optional metadata
   */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ListPostsResponseDto {
  /**
   * List of posts
   */
  data: PostResponseDto[];

  /**
   * Optional pagination metadata
   */
  @IsOptional()
  @IsObject()
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}