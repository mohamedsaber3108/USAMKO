import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType } from '../interfaces/campaign.interface';

class CampaignContentDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];
}

class CampaignTargetingDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accounts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];
}

class CampaignScheduleDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(['once', 'daily', 'weekly', 'monthly'])
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  times?: string[];
}

class CampaignLimitsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxActions?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxPerDay?: number;
}

class CampaignAutomationDto {
  @IsOptional()
  @IsBoolean()
  useBrowser?: boolean;

  @IsOptional()
  @IsBoolean()
  humanBehavior?: boolean;

  @IsOptional()
  @IsBoolean()
  randomDelays?: boolean;

  @IsOptional()
  @IsBoolean()
  proxyRotation?: boolean;
}

class CampaignConfigDto {
  @IsArray()
  @IsString({ each: true })
  platforms: string[];

  @ValidateNested()
  @Type(() => CampaignContentDto)
  content: CampaignContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTargetingDto)
  targeting?: CampaignTargetingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignScheduleDto)
  schedule?: CampaignScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignLimitsDto)
  limits?: CampaignLimitsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignAutomationDto)
  automation?: CampaignAutomationDto;
}

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @ValidateNested()
  @Type(() => CampaignConfigDto)
  config: CampaignConfigDto;
}
