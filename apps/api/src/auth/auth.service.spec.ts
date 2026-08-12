import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'USER', tenantId: 'tenant1' };
      const result = await service.generateTokens(user as any);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
