import { PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { CampaignStatus } from '../interfaces/campaign.interface';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
