import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auth } from '../common/decorators/auth.decorator';

/**
 * Settings controller for user preferences
 */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get user settings
   */
  @Get()
  async getSettings(@Auth() user: any) {
    return this.settingsService.getSettings(user.id);
  }

  /**
   * Update user settings
   */
  @Patch()
  async updateSettings(
    @Auth() user: any,
    @Body() dto: {
      timezone?: string;
      language?: string;
      theme?: string;
      notifications?: Record<string, any>;
    },
  ) {
    return this.settingsService.updateSettings(user.id, dto);
  }

  /**
   * Update notification preferences
   */
  @Patch('notifications')
  async updateNotificationPreferences(
    @Auth() user: any,
    @Body() dto: { preferences: Record<string, boolean> },
  ) {
    return this.settingsService.updateNotificationPreferences(
      user.id,
      dto.preferences,
    );
  }

  /**
   * Get team members
   */
  @Get('team')
  async getTeamMembers(@Auth() user: any) {
    return this.settingsService.getTeamMembers(user.tenantId);
  }

  /**
   * Invite team member
   */
  @Post('team/invite')
  async inviteTeamMember(
    @Auth() user: any,
    @Body() dto: { email: string; role: string },
  ) {
    return this.settingsService.inviteTeamMember(
      user.tenantId,
      user.id,
      dto.email,
      dto.role,
    );
  }

  /**
   * Update team member role
   */
  @Patch('team/:memberId/role')
  async updateTeamMemberRole(
    @Auth() user: any,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
  ) {
    return this.settingsService.updateTeamMemberRole(
      user.tenantId,
      memberId,
      role,
      user.id,
    );
  }

  /**
   * Remove team member
   */
  @Delete('team/:memberId')
  async removeTeamMember(
    @Auth() user: any,
    @Param('memberId') memberId: string,
  ) {
    return this.settingsService.removeTeamMember(
      user.tenantId,
      memberId,
      user.id,
    );
  }

  /**
   * Get team activity logs
   */
  @Get('team/logs')
  async getTeamActivityLogs(
    @Auth() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    return this.settingsService.getTeamActivityLogs(
      user.tenantId,
      pageNum,
      limitNum,
    );
  }
}