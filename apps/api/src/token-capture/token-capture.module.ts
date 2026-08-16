import { Module } from '@nestjs/common';
import { TokenCaptureGateway } from './token-capture.gateway';
import { TokenCaptureService } from './token-capture.service';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    SecurityModule,
    AuditModule,
  ],
  providers: [
    TokenCaptureGateway,
    TokenCaptureService,
    PrismaService,
  ],
  exports: [TokenCaptureService],
})
export class TokenCaptureModule {}
