import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LinkoutController } from './linkout.controller';
import { LinkoutService } from './linkout.service';
import { FreeEmailFinderService } from './free-email-finder.service';
import { EmailVerificationService } from './email-verification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [LinkoutController],
  providers: [
    LinkoutService,
    FreeEmailFinderService,
    EmailVerificationService,
  ],
  exports: [LinkoutService, FreeEmailFinderService],
})
export class LinkoutModule {}
