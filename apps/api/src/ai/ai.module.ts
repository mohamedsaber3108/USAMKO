import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { BedrockService } from './bedrock.service';

@Module({
  controllers: [AiController],
  providers: [AiService, BedrockService],
  exports: [AiService, BedrockService],
})
export class AiModule {}
