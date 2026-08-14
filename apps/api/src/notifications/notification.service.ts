import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Notification service for in-app notifications
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    tenantId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        tenantId,
        type,
        title,
        message,
        data: data || {},
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        // readAt: true,
        data: true,
        createdAt: true,
      },
    });

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(
    userId: string,
    tenantId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId, tenantId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          read: true,
          // readAt: true,
          data: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: await this.getUnreadCount(userId, tenantId),
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, tenantId: string) {
    return this.prisma.notification.count({
      where: { userId, tenantId, read: false },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.read) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        data: true,
        createdAt: true,
      },
    });

    return updated;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, tenantId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, tenantId, read: false },
      data: { read: true },
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string, tenantId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId, tenantId },
    });

    return { message: 'All notifications deleted' };
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string,
    tenantId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ) {
    return this.createNotification(userId, tenantId, type, title, message, data);
  }

  /**
   * Send campaign completion notification
   */
  async sendCampaignCompletedNotification(
    userId: string,
    tenantId: string,
    campaignName: string,
    results: Record<string, any>,
  ) {
    return this.createNotification(
      userId,
      tenantId,
      'success',
      'Campaign Completed',
      `Your campaign "${campaignName}" has been completed successfully!`,
      { campaignName, results },
    );
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(
    userId: string,
    tenantId: string,
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>,
  ) {
    return this.createNotification(
      userId,
      tenantId,
      'error',
      'Error Alert',
      `An error occurred: ${errorMessage}`,
      { errorType, errorMessage, context },
    );
  }
}