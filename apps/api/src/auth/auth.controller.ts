import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Patch,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { Auth } from '../common/decorators/auth.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { Permissions, Permission } from '../common/decorators/permissions.decorator';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(@Auth() user: any) {
    return this.authService.login(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  async refresh(@User() user: any) {
    return this.authService.refreshTokens(user);
  }

  // Admin-only endpoints
  @Get('users')
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.READ)
  async getAllUsers(@Auth() user: any) {
    return this.authService.getAllUsers(user);
  }

  @Patch('users/:userId/role')
  @Roles(UserRole.ADMIN)
  @Permissions(Permission.UPDATE)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @Auth() user: any
  ) {
    return this.authService.updateUserRole(userId, role);
  }

  // Viewer endpoints - read-only access
  @Get('profile')
  @Roles(UserRole.VIEWER, UserRole.USER, UserRole.ADMIN)
  @Permissions(Permission.READ)
  async getProfile(@Auth() user: any) {
    return this.authService.getProfile(user);
  }

  // Email verification endpoints
  @Post('verify-email/request')
  @HttpCode(HttpStatus.OK)
  async requestEmailVerification(@Auth() user: any) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // Password reset endpoints
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
