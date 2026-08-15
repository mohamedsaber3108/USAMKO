import { Module } from '@nestjs/common';
import { LinkedInController } from './linkedin.controller';
import { LinkedInService } from './linkedin.service';
import { LinkedInProfilesService } from './linkedin-profiles.service';
import { LinkedInSessionsService } from './linkedin-sessions.service';
import { LinkedInMessagesService } from './linkedin-messages.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LinkedInController],
  providers: [
    LinkedInService,
    LinkedInProfilesService,
    LinkedInSessionsService,
    LinkedInMessagesService,
  ],
  exports: [
    LinkedInService,
    LinkedInProfilesService,
    LinkedInSessionsService,
    LinkedInMessagesService,
  ],
})
export class LinkedInModule {}
