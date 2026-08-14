// Platform service for managing social media platform accounts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../security/encryption.service';
import { SocialPlatform, AccountStatus, PlatformAccount, PlatformPost } from './platform.model';
import { CreatePostDto } from './dto/create-post.dto';
import { PostResponseDto, PostStatus } from './dto/post-response.dto';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { TwitterAdapter } from './adapters/twitter.adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { YouTubeAdapter } from './adapters/youtube.adapter';
import { PinterestAdapter } from './adapters/pinterest.adapter';
import { RedditAdapter } from './adapters/reddit.adapter';
import { VKAdapter } from './adapters/vk.adapter';
import { AskFmAdapter } from './adapters/askfm.adapter';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Decrypt token if it's encrypted JSON format
   */
  private async decryptTokenIfNeeded(token: string | null, tenantId: string): Promise<string | undefined> {
    if (!token) return undefined;

    try {
      // Check if it's encrypted JSON format
      const parsed = JSON.parse(token);
      if (parsed.ciphertext && parsed.iv && parsed.authTag) {
        // It's encrypted - decrypt it
        return await this.encryption.decryptFromJson(token, tenantId);
      }
      // Not encrypted - return as-is (for backward compatibility)
      return token;
    } catch {
      // Not JSON - return as plain text (for backward compatibility)
      return token;
    }
  }

  /**
   * Encrypt token for storage
   */
  private async encryptToken(token: string, tenantId: string): Promise<string> {
    return await this.encryption.encryptToJson(token, tenantId);
  }

  /**
   * Get all platform accounts for a tenant
   */
  async getAllAccounts(tenantId: string): Promise<PlatformAccount[]> {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt tokens for each account
    const decryptedAccounts = await Promise.all(
      accounts.map(async (a) => ({
        id: a.id,
        tenantId: a.tenantId,
        userId: a.userId,
        platform: a.platform as SocialPlatform,
        accountName: a.accountName,
        accountId: a.accountId,
        username: a.username || undefined,
        displayName: a.displayName || undefined,
        profileUrl: a.profileUrl || undefined,
        accessToken: await this.decryptTokenIfNeeded(a.accessToken, tenantId),
        refreshToken: await this.decryptTokenIfNeeded(a.refreshToken, tenantId),
        expiresAt: a.expiresAt || undefined,
        cookies: a.cookies as any,
        status: a.status as AccountStatus,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    );

    return decryptedAccounts;
  }

  /**
   * Get platform account by ID
   */
  async getAccountById(id: string): Promise<PlatformAccount | null> {
    const account = await this.prisma.platformAccount.findUnique({
      where: { id },
    });

    if (!account) return null;

    return {
      id: account.id,
      tenantId: account.tenantId,
      userId: account.userId,
      platform: account.platform as SocialPlatform,
      accountName: account.accountName,
      accountId: account.accountId,
      username: account.username || undefined,
      displayName: account.displayName || undefined,
      profileUrl: account.profileUrl || undefined,
      accessToken: await this.decryptTokenIfNeeded(account.accessToken, account.tenantId),
      refreshToken: await this.decryptTokenIfNeeded(account.refreshToken, account.tenantId),
      expiresAt: account.expiresAt || undefined,
      cookies: account.cookies as any,
      status: account.status as AccountStatus,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Get accounts by platform
   */
  async getAccountsByPlatform(
    tenantId: string,
    platform: SocialPlatform
  ): Promise<PlatformAccount[]> {
    const accounts = await this.prisma.platformAccount.findMany({
      where: { tenantId, platform: platform as any },
      orderBy: { createdAt: 'desc' },
    });

    // Decrypt tokens for each account
    const decryptedAccounts = await Promise.all(
      accounts.map(async (a) => ({
        id: a.id,
        tenantId: a.tenantId,
        userId: a.userId,
        platform: a.platform as SocialPlatform,
        accountName: a.accountName,
        accountId: a.accountId,
        username: a.username || undefined,
        displayName: a.displayName || undefined,
        profileUrl: a.profileUrl || undefined,
        accessToken: await this.decryptTokenIfNeeded(a.accessToken, tenantId),
        refreshToken: await this.decryptTokenIfNeeded(a.refreshToken, tenantId),
        expiresAt: a.expiresAt || undefined,
        cookies: a.cookies as any,
        status: a.status as AccountStatus,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    );

    return decryptedAccounts;
  }

  /**
   * Create a new platform account
   */
  async createAccount(
    tenantId: string,
    platform: SocialPlatform,
    accountName: string,
    accountId: string,
    username?: string,
    displayName?: string,
    profileUrl?: string,
    accessToken?: string,
    refreshToken?: string,
    expiresAt?: Date,
    cookies?: any
  ): Promise<PlatformAccount> {
    // Check if account already exists
    const existing = await this.prisma.platformAccount.findFirst({
      where: {
        tenantId,
        platform: platform as any,
        accountId,
      },
    });

    if (existing) {
      throw new ConflictException('Account already connected');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = accessToken
      ? await this.encryptToken(accessToken, tenantId)
      : null;
    const encryptedRefreshToken = refreshToken
      ? await this.encryptToken(refreshToken, tenantId)
      : null;

    const account = await this.prisma.platformAccount.create({
      data: {
        id: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId: 'default_user_id', // In production, get from auth context
        platform: platform as any,
        accountName,
        accountId,
        username: username || null,
        displayName: displayName || null,
        profileUrl: profileUrl || null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt || null,
        cookies: cookies || null,
        status: AccountStatus.CONNECTED as any,
      },
    });

    return {
      id: account.id,
      tenantId: account.tenantId,
      userId: account.userId,
      platform: account.platform as SocialPlatform,
      accountName: account.accountName,
      accountId: account.accountId,
      username: account.username || undefined,
      displayName: account.displayName || undefined,
      profileUrl: account.profileUrl || undefined,
      accessToken: accessToken, // Return unencrypted for response
      refreshToken: refreshToken, // Return unencrypted for response
      expiresAt: account.expiresAt || undefined,
      cookies: account.cookies as any,
      status: account.status as AccountStatus,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Update platform account
   */
  async updateAccount(
    id: string,
    data: Partial<{
      username: string;
      displayName: string;
      profileUrl: string;
      accessToken: string;
      refreshToken: string;
      cookies: any;
      status: AccountStatus;
    }>
  ): Promise<PlatformAccount> {
    const account = await this.getAccountById(id);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    // Encrypt tokens if provided
    const encryptedAccessToken = data.accessToken
      ? await this.encryptToken(data.accessToken, account.tenantId)
      : undefined;
    const encryptedRefreshToken = data.refreshToken
      ? await this.encryptToken(data.refreshToken, account.tenantId)
      : undefined;

    const updateData: any = {
      username: data.username,
      displayName: data.displayName || null,
      profileUrl: data.profileUrl || null,
      cookies: data.cookies || null,
      status: data.status as any,
    };

    if (encryptedAccessToken !== undefined) {
      updateData.accessToken = encryptedAccessToken;
    }
    if (encryptedRefreshToken !== undefined) {
      updateData.refreshToken = encryptedRefreshToken;
    }

    const updated = await this.prisma.platformAccount.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      userId: updated.userId,
      platform: updated.platform as SocialPlatform,
      accountName: updated.accountName,
      accountId: updated.accountId,
      username: updated.username || undefined,
      displayName: updated.displayName || undefined,
      profileUrl: updated.profileUrl || undefined,
      accessToken: data.accessToken || account.accessToken, // Return unencrypted
      refreshToken: data.refreshToken || account.refreshToken, // Return unencrypted
      expiresAt: updated.expiresAt || undefined,
      cookies: updated.cookies as any,
      status: updated.status as AccountStatus,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Disconnect/delete platform account
   */
  async disconnectAccount(id: string): Promise<void> {
    const account = await this.getAccountById(id);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    await this.prisma.platformAccount.delete({
      where: { id },
    });
  }

  /**
   * Create a post on a platform
   */
  async createPost(
    platformAccountId: string,
    postData: CreatePostDto,
    tenantId: string
  ): Promise<PostResponseDto> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    // Create the appropriate adapter based on platform
    const adapter = this.getAdapterForPlatform(account);

    // Create the post using the adapter
    const response = await adapter.createPost(postData);

    // Map response to PostResponseDto
    const dtoResponse: PostResponseDto = {
      id: response.id,
      content: response.content,
      mediaUrl: response.mediaUrl,
      mediaType: response.mediaType,
      publishedAt: response.publishedAt,
      status: response.status as PostStatus,
      error: response.error,
      platformId: response.platformId,
      platformPostId: response.platformPostId,
      metadata: response.metadata,
    };

    // Save post to database
    await this.prisma.platformPost.create({
      data: {
        id: `post_${Date.now()}`,
        platformAccountId,
        platformPostId: response.platformPostId || response.id,
        content: response.content,
        mediaUrl: response.mediaUrl || null,
        mediaType: response.mediaType || null,
        status: response.status,
        error: response.error || null,
        publishedAt: response.publishedAt || null,
        metadata: response.metadata || null,
      },
    });

    return dtoResponse;
  }

  /**
   * Get a post by ID
   */
  async getPost(
    platformAccountId: string,
    postId: string,
    tenantId: string
  ): Promise<PostResponseDto> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    // Get post from platform using adapter
    const adapter = this.getAdapterForPlatform(account);
    const response = await adapter.getPost(postId);

    // Map response to PostResponseDto
    return {
      id: response.id,
      content: response.content,
      mediaUrl: response.mediaUrl,
      mediaType: response.mediaType,
      publishedAt: response.publishedAt,
      status: response.status as PostStatus,
      error: response.error,
      platformId: response.platformId,
      platformPostId: response.platformPostId,
      metadata: response.metadata,
    };
  }

  /**
   * List posts for a platform
   */
  async listPosts(
    platformAccountId: string,
    options?: { limit?: number; offset?: number; before?: string; after?: string },
    tenantId?: string
  ): Promise<PostResponseDto[]> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (tenantId && account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    // List posts from platform using adapter
    const adapter = this.getAdapterForPlatform(account);
    const responses = await adapter.listPosts({
      limit: options?.limit,
      after: options?.after,
    });

    // Map responses to PostResponseDto
    return responses.map(response => ({
      id: response.id,
      content: response.content,
      mediaUrl: response.mediaUrl,
      mediaType: response.mediaType,
      publishedAt: response.publishedAt,
      status: response.status as PostStatus,
      error: response.error,
      platformId: response.platformId,
      platformPostId: response.platformPostId,
      metadata: response.metadata,
    }));
  }

  /**
   * Delete a post
   */
  async deletePost(
    platformAccountId: string,
    postId: string,
    tenantId: string
  ): Promise<void> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    // Delete post from platform using adapter
    const adapter = this.getAdapterForPlatform(account);
    await adapter.deletePost(postId);

    // Delete post from database
    await this.prisma.platformPost.deleteMany({
      where: {
        platformAccountId,
        platformPostId: postId,
      },
    });
  }

  /**
   * Publish to multiple platforms
   */
  async publishToPlatforms(
    platformAccountId: string,
    dto: { content: string; platforms?: string[]; mediaUrl?: string },
    tenantId: string
  ): Promise<{ success: boolean; postedTo: string[] }> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    const postedTo: string[] = [];
    const platformsToPost = dto.platforms || [account.platform];

    for (const platform of platformsToPost) {
      try {
        const platformAccount = await this.prisma.platformAccount.findFirst({
          where: {
            tenantId,
            platform: platform as any,
          },
        });

        if (platformAccount) {
          const adapter = this.getAdapterForPlatform(platformAccount as any);
          await adapter.createPost({
            text: dto.content,
            mediaUrl: dto.mediaUrl,
          });
          postedTo.push(platform);
        }
      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
      }
    }

    return { success: postedTo.length > 0, postedTo };
  }

  /**
   * Refresh access token for a platform account
   */
  async refreshToken(platformAccountId: string, tenantId: string): Promise<{ success: boolean; newToken?: string }> {
    const account = await this.getAccountById(platformAccountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new BadRequestException('Account does not belong to this tenant');
    }

    const adapter = this.getAdapterForPlatform(account);

    if (!adapter.refreshAccessToken) {
      throw new BadRequestException('Token refresh not supported for this platform');
    }

    try {
      const newToken = await adapter.refreshAccessToken();

      // Encrypt new token before storing
      const encryptedToken = await this.encryptToken(newToken, tenantId);

      await this.prisma.platformAccount.update({
        where: { id: platformAccountId },
        data: { accessToken: encryptedToken },
      });

      return { success: true, newToken }; // Return unencrypted token
    } catch (error) {
      throw new BadRequestException('Failed to refresh token');
    }
  }

  /**
   * Post to a platform
   */
  async postToPlatform(
    accountId: string,
    content: string,
    mediaUrl?: string
  ): Promise<PlatformPost> {
    const account = await this.getAccountById(accountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    // In production, this would use the actual platform API
    // For now, return a mock response
    return {
      id: `post_${Date.now()}`,
      platformAccountId: accountId,
      platformPostId: `post_${Date.now()}`,
      content,
      mediaUrl,
      status: 'published',
      publishedAt: new Date(),
    };
  }

  /**
   * Get posts from a platform
   */
  async getPostsFromPlatform(accountId: string, limit: number = 10): Promise<PlatformPost[]> {
    // In production, this would fetch from the actual platform API
    return [];
  }

  /**
   * Get platform profile
   */
  async getPlatformProfile(accountId: string): Promise<any> {
    const account = await this.getAccountById(accountId);

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    // In production, this would fetch from the actual platform API
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      platform: account.platform,
      followers: 0,
      following: 0,
      posts: 0,
    };
  }

  /**
   * Get adapter for a platform
   */
  private getAdapterForPlatform(account: PlatformAccount) {
    switch (account.platform) {
      case SocialPlatform.FACEBOOK:
        return new FacebookAdapter(account);
      case SocialPlatform.INSTAGRAM:
        return new InstagramAdapter(account);
      case SocialPlatform.LINKEDIN:
        return new LinkedInAdapter(account);
      case SocialPlatform.TWITTER:
        return new TwitterAdapter(account);
      case SocialPlatform.TELEGRAM:
        return new TelegramAdapter(account);
      case SocialPlatform.YOUTUBE:
        return new YouTubeAdapter(account);
      case SocialPlatform.PINTEREST:
        return new PinterestAdapter(account);
      case SocialPlatform.REDDIT:
        return new RedditAdapter(account);
      case 'VK' as SocialPlatform:
        return new VKAdapter(account);
      case 'ASKFM' as SocialPlatform:
        return new AskFmAdapter(account);
      default:
        throw new BadRequestException(`Platform ${account.platform} not supported`);
    }
  }
}