// Platform module for managing social media platform accounts

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SecurityModule } from '../security/security.module';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';

@Module({
  imports: [SecurityModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    PrismaService,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}