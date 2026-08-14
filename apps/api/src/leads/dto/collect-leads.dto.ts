import { IsString, IsOptional, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator';

export enum LeadSource {
  LINKEDIN = 'linkedin',
  GOOGLE_MAPS = 'google_maps',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  MANUAL = 'manual',
}

export class CollectLeadsDto {
  @IsEnum(LeadSource)
  source: LeadSource;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxResults?: number;

  @IsBoolean()
  @IsOptional()
  enrichWithEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  autoScore?: boolean;

  @IsString()
  @IsOptional()
  searchQuery?: string;
}
