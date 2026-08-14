import { IsString, IsOptional, IsInt, IsArray, Min, Max, IsEnum } from 'class-validator';

export enum TargetSource {
  ALL_LEADS = 'all_leads',
  FILTERED_LEADS = 'filtered_leads',
  IMPORTED_LIST = 'imported_list',
  CUSTOM_QUERY = 'custom_query',
}

export class TargetCriteriaDto {
  @IsEnum(TargetSource)
  source: TargetSource;

  @IsArray()
  @IsOptional()
  leadIds?: string[];

  @IsString()
  @IsOptional()
  leadSource?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minScore?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxScore?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  limit?: number;
}
