import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenCaptureGateway } from './token-capture.gateway';
import { TokenCaptureService } from './token-capture.service';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    SecurityModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  providers: [
    TokenCaptureGateway,
    TokenCaptureService,
    PrismaService,
  ],
  exports: [TokenCaptureService],
})
export class TokenCaptureModule {}
