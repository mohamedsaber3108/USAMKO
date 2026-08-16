// Platform controller for managing social media platform accounts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Auth } from '../common/decorators/auth.decorator';
import { PlatformService } from './platform.service';
import { SocialPlatform, PlatformPost, AccountStatus } from './platform.model';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto';

@Controller('platforms')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * Get all platform accounts for current tenant
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getAllAccounts(@Auth() user: any) {
    return this.platformService.getAllAccounts(user.tenantId);
  }

  /**
   * Get platform account by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getAccount(@Param('id') id: string) {
    return this.platformService.getAccountById(id);
  }

  /**
   * Get accounts by platform
   */
  @Get('platform/:platform')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getAccountsByPlatform(@Param('platform') platform: SocialPlatform, @Auth() user: any) {
    return this.platformService.getAccountsByPlatform(user.tenantId, platform);
  }

  /**
   * Create a new platform account
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async createAccount(
    @Body()
    dto: {
      platform: SocialPlatform;
      accountName?: string;
      accountId?: string;
      username?: string;
      displayName?: string;
      profileUrl?: string;
      accessToken?: string;
      refreshToken?: string;
      cookies?: any;
      metadata?: any;
    },
    @Auth() user: any
  ) {
    return this.platformService.createAccount(
      user.tenantId,
      dto.platform,
      dto.accountName || dto.username || `${dto.platform} Account`,
      dto.accountId || `${dto.platform.toLowerCase()}_${Date.now()}`,
      dto.username,
      dto.displayName,
      dto.profileUrl,
      dto.accessToken,
      dto.refreshToken,
      undefined, // expiresAt
      dto.cookies,
      user.userId // Pass the authenticated user's ID
    );
  }

  /**
   * Update platform account
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateAccount(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      username: string;
      displayName: string;
      profileUrl: string;
      accessToken: string;
      refreshToken: string;
      cookies: any;
      status: AccountStatus;
    }>
  ) {
    return this.platformService.updateAccount(id, dto);
  }

  /**
   * Disconnect/delete platform account
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async disconnectAccount(@Param('id') id: string) {
    await this.platformService.disconnectAccount(id);
  }

  /**
   * Create a post on a platform
   */
  @Post(':platformId/posts')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async createPost(
    @Param('platformId') platformId: string,
    @Body() dto: CreatePostDto,
    @Auth() user: any
  ): Promise<PostResponseDto> {
    return this.platformService.createPost(platformId, dto, user.tenantId);
  }

  /**
   * Get a post by ID
   */
  @Get(':platformId/posts/:postId')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getPost(
    @Param('platformId') platformId: string,
    @Param('postId') postId: string,
    @Auth() user: any
  ): Promise<PostResponseDto> {
    return this.platformService.getPost(platformId, postId, user.tenantId);
  }

  /**
   * List posts for a platform
   */
  @Get(':platformId/posts')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async listPosts(
    @Param('platformId') platformId: string,
    @Auth() user: any,
    @Body() options?: { limit?: number; offset?: number; before?: string; after?: string }
  ): Promise<PostResponseDto[]> {
    return this.platformService.listPosts(platformId, options, user.tenantId);
  }

  /**
   * Delete a post
   */
  @Delete(':platformId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async deletePost(
    @Param('platformId') platformId: string,
    @Param('postId') postId: string,
    @Auth() user: any
  ): Promise<void> {
    await this.platformService.deletePost(platformId, postId, user.tenantId);
  }

  /**
   * Publish to multiple platforms
   */
  @Post(':platformId/publish')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async publishToPlatforms(
    @Param('platformId') platformId: string,
    @Body() dto: { content: string; platforms?: string[]; mediaUrl?: string },
    @Auth() user: any
  ): Promise<{ success: boolean; postedTo: string[] }> {
    return this.platformService.publishToPlatforms(platformId, dto, user.tenantId);
  }

  /**
   * Refresh access token for a platform account
   */
  @Post(':platformId/refresh-token')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async refreshToken(
    @Param('platformId') platformId: string,
    @Auth() user: any
  ): Promise<{ success: boolean; newToken?: string }> {
    return this.platformService.refreshToken(platformId, user.tenantId);
  }

  /**
   * Post to a platform
   */
  @Post(':id/post')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async postToPlatform(
    @Param('id') id: string,
    @Body() dto: { content: string; mediaUrl?: string }
  ) {
    return this.platformService.postToPlatform(id, dto.content, dto.mediaUrl);
  }

  /**
   * Get platform profile
   */
  @Get(':id/profile')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.VIEWER)
  async getPlatformProfile(@Param('id') id: string) {
    return this.platformService.getPlatformProfile(id);
  }
}