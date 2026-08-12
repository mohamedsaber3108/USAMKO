import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, PrismaService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}