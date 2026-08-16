import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { TenantModule } from '../tenant/tenant.module';
import { Reflector } from '@nestjs/core';

const oauthProviders = [];
if (process.env.GOOGLE_CLIENT_ID) {
  oauthProviders.push(GoogleStrategy);
} else {
  Logger.warn('Google OAuth not configured (GOOGLE_CLIENT_ID missing)', 'AuthModule');
}
if (process.env.GITHUB_CLIENT_ID) {
  oauthProviders.push(GithubStrategy);
} else {
  Logger.warn('GitHub OAuth not configured (GITHUB_CLIENT_ID missing)', 'AuthModule');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    }),
    TenantModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    ...oauthProviders,
    RolesGuard,
    TenantGuard,
    Reflector,
    ConfigService,
  ],
  exports: [AuthService, RolesGuard, TenantGuard],
})
export class AuthModule {}
