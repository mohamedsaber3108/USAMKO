import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TokenCaptureGateway } from './token-capture.gateway';
import { TokenCaptureService } from './token-capture.service';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { SecurityModule } from '../security/security.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../prisma.service';

/**
 * Token Capture Module
 *
 * Provides WebSocket gateway for capturing OAuth tokens from Chrome Extension.
 *
 * Features:
 * - Real-time WebSocket communication
 * - JWT authentication
 * - Token encryption before storage
 * - Audit logging
 * - Multi-tenant support
 *
 * Import this module in AppModule to enable token capture.
 *
 * @example
 * @Module({
 *   imports: [
 *     TokenCaptureModule,
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 */
@Module({
  imports: [
    SecurityModule, // For EncryptionService
    AuditModule, // For AuditService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'your-jwt-secret',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  providers: [
    TokenCaptureGateway,
    TokenCaptureService,
    WsJwtAuthGuard,
    PrismaService,
  ],
  exports: [TokenCaptureService],
})
export class TokenCaptureModule {}
