import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LinkedInService } from './linkedin.service';
import { LinkedInProfilesService } from './linkedin-profiles.service';
import { LinkedInMessagesService } from './linkedin-messages.service';

import { JwtAuthGuard } from '../../apps/api/src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('linkedin')
export class LinkedInController {
  constructor(
    private readonly linkedinService: LinkedInService,
    private readonly profilesService: LinkedInProfilesService,
    private readonly messagesService: LinkedInMessagesService,
  ) {}

  /**
   * Search LinkedIn profiles
   */
  @Post('search')
  async search(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      keywords: string;
      location?: string;
      title?: string;
      company?: string;
      limit?: number;
    },
  ) {
    return this.linkedinService.searchAndSave(
      body.tenantId,
      body.userId,
      {
        keywords: body.keywords,
        location: body.location,
        title: body.title,
        company: body.company,
        limit: body.limit,
      },
    );
  }

  /**
   * Get all profiles
   */
  @Get('profiles')
  async getProfiles(
    @Query('tenantId') tenantId: string,
    @Query('isConnected') isConnected?: string,
    @Query('location') location?: string,
  ) {
    return this.linkedinService.getProfiles(tenantId, {
      isConnected: isConnected === 'true' ? true : undefined,
      location,
    });
  }

  /**
   * Get profile by public identifier
   */
  @Get('profiles/:publicIdentifier')
  async getProfile(
    @Query('tenantId') tenantId: string,
    @Param('publicIdentifier') publicIdentifier: string,
  ) {
    return this.linkedinService.getProfile(tenantId, publicIdentifier);
  }

  /**
   * Send connection request
   */
  @Post('connect')
  async connect(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      publicIdentifier: string;
      message?: string;
    },
  ) {
    return this.linkedinService.sendConnectionRequest(
      body.tenantId,
      body.userId,
      body.publicIdentifier,
      body.message,
    );
  }

  /**
   * Send message
   */
  @Post('message')
  async sendMessage(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      publicIdentifier: string;
      message: string;
    },
  ) {
    return this.linkedinService.sendMessage(
      body.tenantId,
      body.userId,
      body.publicIdentifier,
      body.message,
    );
  }

  /**
   * Get all messages for user
   */
  @Get('messages')
  async getMessages(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('status') status?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.messagesService.findAll(tenantId, userId, {
      status,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
    });
  }

  /**
   * Get messages for specific profile
   */
  @Get('messages/profile/:profileId')
  async getMessagesByProfile(
    @Query('tenantId') tenantId: string,
    @Param('profileId') profileId: string,
  ) {
    return this.messagesService.findByProfile(tenantId, profileId);
  }

  /**
   * Get statistics
   */
  @Get('statistics')
  async getStatistics(@Query('tenantId') tenantId: string) {
    return this.linkedinService.getStatistics(tenantId);
  }

  /**
   * Create session
   */
  @Post('session')
  async createSession(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      cookies: string;
      userAgent: string;
      proxy?: string;
      ipAddress?: string;
    },
  ) {
    return this.linkedinService.createSession(body.tenantId, body.userId, {
      cookies: body.cookies,
      userAgent: body.userAgent,
      proxy: body.proxy,
      ipAddress: body.ipAddress,
    });
  }

  /**
   * Get active session
   */
  @Get('session/active')
  async getActiveSession(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
  ) {
    return this.linkedinService.getActiveSession(tenantId, userId);
  }
}
