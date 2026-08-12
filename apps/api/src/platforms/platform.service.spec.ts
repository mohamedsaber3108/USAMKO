import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('PlatformService', () => {
  let service: PlatformService;

  const mockPrisma = {
    platformAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    platformPost: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockAccount = {
    id: 'acc1',
    tenantId: 'tenant1',
    userId: 'user1',
    platform: 'INSTAGRAM',
    accountName: 'testaccount',
    accountId: 'ext_123',
    username: 'testuser',
    displayName: 'Test User',
    profileUrl: null,
    accessToken: 'token123',
    refreshToken: null,
    expiresAt: null,
    cookies: null,
    status: 'CONNECTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllAccounts', () => {
    it('should return all accounts for a tenant', async () => {
      mockPrisma.platformAccount.findMany.mockResolvedValue([mockAccount]);

      const result = await service.getAllAccounts('tenant1');

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('INSTAGRAM');
      expect(mockPrisma.platformAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant1' } }),
      );
    });

    it('should return empty array when no accounts exist', async () => {
      mockPrisma.platformAccount.findMany.mockResolvedValue([]);

      const result = await service.getAllAccounts('tenant1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      mockPrisma.platformAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.getAccountById('acc1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('acc1');
    });

    it('should return null when account not found', async () => {
      mockPrisma.platformAccount.findUnique.mockResolvedValue(null);

      const result = await service.getAccountById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('should create a new platform account', async () => {
      mockPrisma.platformAccount.findFirst.mockResolvedValue(null);
      mockPrisma.platformAccount.create.mockResolvedValue(mockAccount);

      const result = await service.createAccount(
        'tenant1',
        'INSTAGRAM' as any,
        'testaccount',
        'ext_123',
        'testuser',
      );

      expect(result).toBeDefined();
      expect(result.platform).toBe('INSTAGRAM');
      expect(mockPrisma.platformAccount.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when account already exists', async () => {
      mockPrisma.platformAccount.findFirst.mockResolvedValue(mockAccount);

      await expect(
        service.createAccount('tenant1', 'INSTAGRAM' as any, 'testaccount', 'ext_123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('disconnectAccount', () => {
    it('should delete the account', async () => {
      mockPrisma.platformAccount.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.platformAccount.delete.mockResolvedValue(mockAccount);

      await service.disconnectAccount('acc1');

      expect(mockPrisma.platformAccount.delete).toHaveBeenCalledWith({
        where: { id: 'acc1' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrisma.platformAccount.findUnique.mockResolvedValue(null);

      await expect(service.disconnectAccount('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
