import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, PrismaService, ConfigService],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}