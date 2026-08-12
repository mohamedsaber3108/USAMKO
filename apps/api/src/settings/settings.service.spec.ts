import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrisma = {
    userSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    teamActivityLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateSettings', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        id: 's1',
        userId: 'user1',
        timezone: 'UTC',
        language: 'en',
        theme: 'light',
        notifications: {},
      };
      mockPrisma.userSetting.findUnique.mockResolvedValue(mockSettings);

      const result = await service.getOrCreateSettings('user1');

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.userSetting.create).not.toHaveBeenCalled();
    });

    it('should create settings if not found', async () => {
      const newSettings = { id: 's1', userId: 'user1' };
      mockPrisma.userSetting.findUnique.mockResolvedValue(null);
      mockPrisma.userSetting.create.mockResolvedValue(newSettings);

      const result = await service.getOrCreateSettings('user1');

      expect(result).toEqual(newSettings);
      expect(mockPrisma.userSetting.create).toHaveBeenCalledWith({
        data: { userId: 'user1' },
      });
    });
  });

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const mockSettings = { id: 's1', userId: 'user1', timezone: 'UTC' };
      mockPrisma.userSetting.findUnique.mockResolvedValue(mockSettings);

      const result = await service.getSettings('user1');

      expect(result).toEqual(mockSettings);
    });

    it('should throw NotFoundException when settings not found', async () => {
      mockPrisma.userSetting.findUnique.mockResolvedValue(null);

      await expect(service.getSettings('user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('should update user settings', async () => {
      const updatedSettings = {
        id: 's1',
        userId: 'user1',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'dark',
        notifications: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.userSetting.update.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings('user1', {
        timezone: 'America/New_York',
        theme: 'dark',
      });

      expect(result.timezone).toBe('America/New_York');
      expect(result.theme).toBe('dark');
      expect(mockPrisma.userSetting.update).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { timezone: 'America/New_York', theme: 'dark' },
        select: expect.any(Object),
      });
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members for a tenant', async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          id: 'tm1',
          userId: 'user1',
          role: 'admin',
          permissions: [],
          joinedAt: new Date(),
          createdAt: new Date(),
          user: { id: 'user1', email: 'test@test.com', name: 'Test', role: 'USER' },
        },
      ]);

      const result = await service.getTeamMembers('tenant1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('email', 'test@test.com');
    });
  });
});
