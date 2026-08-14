// Platform module for managing social media platform accounts

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SecurityModule } from '../security/security.module';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { TwitterAdapter } from './adapters/twitter.adapter';

@Module({
  imports: [SecurityModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    PrismaService,
    FacebookAdapter,
    InstagramAdapter,
    LinkedInAdapter,
    TwitterAdapter,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}