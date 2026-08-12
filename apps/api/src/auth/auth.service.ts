import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { jwtConstants } from './constants';
import { UserRole } from '../common/decorators/roles.decorator';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tenantService: TenantService
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, name } = dto;

    // Get or create default tenant
    const tenant = await this.tenantService.getDefaultTenant();
    const tenantId = tenant.id;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || '',
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user,
      ...tokens,
    };
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    // Get default tenant
    const tenant = await this.tenantService.getDefaultTenant();
    const tenantId = tenant.id;

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // TODO: Store refresh token in database and invalidate it
    // For now, just return success
    return { message: 'Successfully logged out' };
  }

  async refreshTokens(user: any) {
    const tokens = await this.generateTokens(user.userId, user.email, user.role);

    return tokens;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConstants.secret,
      expiresIn: jwtConstants.accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: jwtConstants.refreshTokenExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  // Admin-only: Get all users (filtered by requesting user's tenant)
  async getAllUsers(requestingUser: any) {
    // Only ADMIN can access this
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view all users');
    }

    // Return users from the same tenant only (tenant isolation)
    return this.prisma.user.findMany({
      where: {
        tenantId: requestingUser.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Admin-only: Update user role
  async updateUserRole(userId: string, role: UserRole) {
    // Only ADMIN can access this
    throw new ForbiddenException('You do not have permission to update user roles');
  }

  // Get profile for any authenticated user
  async getProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: this.getPermissionsForRole(user.role),
    };
  }

  // Helper: Get permissions based on role
  private getPermissionsForRole(role: string): string[] {
    switch (role) {
      case UserRole.ADMIN:
        return ['create', 'read', 'update', 'delete', 'manage'];
      case UserRole.USER:
        return ['create', 'read', 'update'];
      case UserRole.VIEWER:
        return ['read'];
      default:
        return [];
    }
  }

  // Get user's tenant info
  async getUserTenant(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return user?.tenant || null;
  }

  /**
   * Find or create user from OAuth provider
   */
  async findOrCreateOAuthUser(
    email: string,
    firstName: string,
    lastName: string,
    avatarUrl?: string,
    provider?: string,
  ) {
    const tenant = await this.tenantService.getDefaultTenant();
    const tenantId = tenant.id;

    // Try to find existing user by email
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }

    // Create new user
    const name = `${firstName} ${lastName}`.trim();
    const password = await bcrypt.hash(`oauth_${Date.now()}`, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password,
        name: name || 'OAuth User',
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(newUser.id, newUser.email, newUser.role);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      ...tokens,
    };
  }

  /**
   * Request email verification
   */
  async requestEmailVerification(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Delete any existing unverified tokens
    await this.prisma.emailVerification.deleteMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    // Create new verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.prisma.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    // In production, send email with verification link
    // For now, return the token
    return {
      message: 'Verification email sent',
      token, // In production, this would be sent via email
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const { token } = dto;

    // Find verification record
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid verification token');
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification token expired');
    }

    // Check if already used
    if (verification.usedAt) {
      throw new BadRequestException('Token already used');
    }

    // Mark as used and verify email
    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
    ]);

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    // Get default tenant
    const tenant = await this.tenantService.getDefaultTenant();
    const tenantId = tenant.id;

    // Find user by email (using compound unique key)
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If user exists, reset link sent' };
    }

    // Delete any existing unverified tokens
    await this.prisma.passwordReset.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Create new reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // In production, send email with reset link
    // For now, return the token
    return {
      message: 'Password reset link sent',
      token, // In production, this would be sent via email
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;

    // Find reset record
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!reset) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Check if expired
    if (reset.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset token expired');
    }

    // Check if already used
    if (reset.usedAt) {
      throw new BadRequestException('Token already used');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mark as used and update password
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { password: hashedPassword },
      }),
    ]);

    return {
      message: 'Password reset successfully',
    };
  }
}
