import { IsString, IsOptional, IsNumber, IsEnum, IsObject } from 'class-validator';

export enum SupportedPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TWITTER = 'twitter',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  REDDIT = 'reddit',
  VK = 'vk',
  ASKFM = 'askfm',
}

/**
 * DTO for capturing OAuth tokens from Chrome Extension
 */
export class CaptureTokenDto {
  @IsEnum(SupportedPlatform)
  platform: SupportedPlatform;

  @IsString()
  accountId: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  accessToken: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsNumber()
  @IsOptional()
  expiresAt?: number; // Unix timestamp

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Response DTO for token capture
 */
export class TokenCaptureResponseDto {
  success: boolean;
  accountId: string;
  platform: string;
  message: string;
  platformAccountId?: string; // ID in our database
}

/**
 * Status DTO for WebSocket connection
 */
export class ConnectionStatusDto {
  connected: boolean;
  userId: string;
  tenantId: string;
  connectedAt: Date;
}
