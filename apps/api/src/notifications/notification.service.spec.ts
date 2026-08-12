import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'n1',
        type: 'info',
        title: 'Test',
        message: 'Test message',
        isRead: false,
        readAt: null,
        data: {},
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification(
        'user1',
        'tenant1',
        'info',
        'Test',
        'Test message',
      );

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user1',
            tenantId: 'tenant1',
            type: 'info',
            title: 'Test',
            message: 'Test message',
          }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'user1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead('n1', 'user1');

      expect(result.isRead).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalled();
    });

    it('should return existing notification if already read', async () => {
      const existing = { id: 'n1', userId: 'user1', isRead: true, readAt: new Date() };
      mockPrisma.notification.findUnique.mockResolvedValue(existing);

      const result = await service.markAsRead('n1', 'user1');

      expect(result).toEqual(existing);
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('n999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user1', 'tenant1');

      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user1', tenantId: 'tenant1', isRead: false },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user1', 'tenant1');

      expect(result).toEqual({ message: 'All notifications marked as read' });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', tenantId: 'tenant1', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'user1' });
      mockPrisma.notification.delete.mockResolvedValue({ id: 'n1' });

      const result = await service.deleteNotification('n1', 'user1');

      expect(result).toEqual({ message: 'Notification deleted' });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.deleteNotification('n999', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
