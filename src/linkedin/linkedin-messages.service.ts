import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedInMessage } from '@prisma/client';

@Injectable()
export class LinkedInMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new message record
   */
  async create(
    tenantId: string,
    userId: string,
    profileId: string,
    body: string,
    messageData?: {
      messageId?: string;
      threadId?: string;
      subject?: string;
    },
  ): Promise<LinkedInMessage> {
    return this.prisma.linkedInMessage.create({
      data: {
        tenantId,
        userId,
        profileId,
        body,
        messageId: messageData?.messageId,
        threadId: messageData?.threadId,
        subject: messageData?.subject,
        status: 'sent',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Find messages by profile
   */
  async findByProfile(
    tenantId: string,
    profileId: string,
  ): Promise<LinkedInMessage[]> {
    return this.prisma.linkedInMessage.findMany({
      where: {
        tenantId,
        profileId,
      },
      orderBy: {
        sentAt: 'desc',
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            publicIdentifier: true,
            profileUrl: true,
          },
        },
      },
    });
  }

  /**
   * Find messages by thread
   */
  async findByThread(
    tenantId: string,
    threadId: string,
  ): Promise<LinkedInMessage[]> {
    return this.prisma.linkedInMessage.findMany({
      where: {
        tenantId,
        threadId,
      },
      orderBy: {
        sentAt: 'asc',
      },
      include: {
        profile: true,
      },
    });
  }

  /**
   * Get all messages for user
   */
  async findAll(
    tenantId: string,
    userId: string,
    filters?: {
      status?: string;
      isRead?: boolean;
    },
  ) {
    return this.prisma.linkedInMessage.findMany({
      where: {
        tenantId,
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
      },
      orderBy: {
        sentAt: 'desc',
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            publicIdentifier: true,
            photoUrl: true,
          },
        },
      },
    });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<LinkedInMessage> {
    return this.prisma.linkedInMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });
  }

  /**
   * Update message status
   */
  async updateStatus(
    messageId: string,
    status: string,
  ): Promise<LinkedInMessage> {
    return this.prisma.linkedInMessage.update({
      where: { id: messageId },
      data: { status },
    });
  }

  /**
   * Get message statistics
   */
  async getStatistics(tenantId: string, userId: string) {
    const [total, sent, unread] = await Promise.all([
      this.prisma.linkedInMessage.count({
        where: { tenantId, userId },
      }),
      this.prisma.linkedInMessage.count({
        where: { tenantId, userId, status: 'sent' },
      }),
      this.prisma.linkedInMessage.count({
        where: { tenantId, userId, isRead: false },
      }),
    ]);

    return {
      total,
      sent,
      unread,
    };
  }

  /**
   * Delete message
   */
  async delete(messageId: string): Promise<void> {
    await this.prisma.linkedInMessage.delete({
      where: { id: messageId },
    });
  }
}
