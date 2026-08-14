import { IsString, IsOptional, IsEmail, IsUrl, IsArray, IsObject, IsInt, Min, Max } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @IsUrl()
  @IsOptional()
  twitterUrl?: string;

  @IsUrl()
  @IsOptional()
  facebookUrl?: string;

  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsUrl()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  source: string;

  @IsUrl()
  @IsOptional()
  sourceUrl?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  companyId?: string;
}
