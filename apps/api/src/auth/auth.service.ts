import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, name } = dto;

    // Default tenant ID (should be created dynamically in production)
    const tenantId = 'default-tenant-id';

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
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

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
    // Default tenant ID (should match the one used in register)
    const tenantId = 'default-tenant-id';

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (!user) {
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
    const tokens = await this.generateTokens(
      user.userId,
      user.email,
      user.role,
    );

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
}