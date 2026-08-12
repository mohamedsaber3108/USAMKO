import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Settings service for user preferences and settings
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create user settings
   */
  async getOrCreateSettings(userId: string) {
    let settings = await this.prisma.userSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSetting.create({
        data: { userId },
      });
    }

    return settings;
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string) {
    const settings = await this.prisma.userSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string,
    data: {
      timezone?: string;
      language?: string;
      theme?: string;
      notifications?: Record<string, any>;
    },
  ) {
    const settings = await this.prisma.userSetting.update({
      where: { userId },
      data,
      select: {
        id: true,
        userId: true,
        timezone: true,
        language: true,
        theme: true,
        notifications: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return settings;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, boolean>,
  ) {
    const settings = await this.getSettings(userId);

    const updatedNotifications = {
      ...(settings.notifications as object || {}),
      ...preferences,
    };

    return this.updateSettings(userId, {
      notifications: updatedNotifications,
    });
  }

  /**
   * Get team members for a tenant
   */
  async getTeamMembers(tenantId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { tenantId, status: 'active' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      permissions: m.permissions,
      joinedAt: m.joinedAt,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Invite team member
   */
  async inviteTeamMember(
    tenantId: string,
    invitedBy: string,
    email: string,
    role: string,
  ) {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user) {
      // Create user with temporary password
      const tempPassword = `temp_${Date.now()}`;
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email,
          name: email.split('@')[0],
          password: await this.hashPassword(tempPassword),
          role: 'USER',
        },
      });
    }

    // Check if team member already exists
    const existingMember = await this.prisma.teamMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });

    if (existingMember) {
      if (existingMember.status === 'removed') {
        // Reactivate the member
        await this.prisma.teamMember.update({
          where: { id: existingMember.id },
          data: { status: 'active', joinedAt: new Date() },
        });
      }
      return {
        message: 'User is already a team member',
        member: existingMember,
      };
    }

    // Create team member
    const member = await this.prisma.teamMember.create({
      data: {
        tenantId,
        userId: user.id,
        role,
        invitedBy,
        status: 'active',
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.teamActivityLog.create({
      data: {
        tenantId,
        userId: invitedBy,
        action: 'invite',
        targetType: 'user',
        targetId: user.id,
        details: { email, role },
      },
    });

    return {
      message: 'Team member invited successfully',
      member,
    };
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    tenantId: string,
    memberId: string,
    role: string,
    updatedBy: string,
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.teamActivityLog.create({
      data: {
        tenantId,
        userId: updatedBy,
        action: 'update_role',
        targetType: 'user',
        targetId: member.userId,
        details: { newRole: role },
      },
    });

    return {
      message: 'Team member role updated successfully',
      member: updated,
    };
  }

  /**
   * Remove team member
   */
  async removeTeamMember(
    tenantId: string,
    memberId: string,
    removedBy: string,
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId, tenantId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { status: 'removed' },
    });

    // Log activity
    await this.prisma.teamActivityLog.create({
      data: {
        tenantId,
        userId: removedBy,
        action: 'remove',
        targetType: 'user',
        targetId: member.userId,
      },
    });

    return { message: 'Team member removed successfully' };
  }

  /**
   * Get team activity logs
   */
  async getTeamActivityLogs(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.teamActivityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.teamActivityLog.count({ where: { tenantId } }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }
}