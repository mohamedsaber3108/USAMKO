import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auth } from '../common/decorators/auth.decorator';

/**
 * Notification controller for in-app notifications
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get all notifications for the current user
   */
  @Get()
  async getUserNotifications(
    @Auth() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('unreadOnly') unreadOnly: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const unreadOnlyBool = unreadOnly === 'true';

    return this.notificationService.getUserNotifications(
      user.id,
      user.tenantId,
      pageNum,
      limitNum,
      unreadOnlyBool,
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Auth() user: any) {
    return this.notificationService.getUnreadCount(user.id, user.tenantId);
  }

  /**
   * Mark a notification as read
   */
  @Post(':id/read')
  async markAsRead(@Auth() user: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllAsRead(@Auth() user: any) {
    return this.notificationService.markAllAsRead(user.id, user.tenantId);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(@Auth() user: any, @Param('id') id: string) {
    return this.notificationService.deleteNotification(id, user.id);
  }

  /**
   * Delete all notifications
   */
  @Delete()
  async deleteAllNotifications(@Auth() user: any) {
    return this.notificationService.deleteAllNotifications(user.id, user.tenantId);
  }
}