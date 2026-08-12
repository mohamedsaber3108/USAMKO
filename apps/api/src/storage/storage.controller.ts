import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Patch,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auth } from '../common/decorators/auth.decorator';

/**
 * Storage controller for file uploads and media management
 */
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload a file
   */
  @Post('upload')
  async uploadFile(
    @Auth() user: any,
    @Body() dto: { metadata?: Record<string, string> },
    @Body('file') file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.storageService.uploadFile(
      user.id,
      user.tenantId,
      file,
      dto.metadata,
    );
  }

  /**
   * Get all media files
   */
  @Get('media')
  async getMediaFiles(
    @Auth() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    return this.storageService.getMediaFiles(
      user.id,
      user.tenantId,
      pageNum,
      limitNum,
    );
  }

  /**
   * Get a specific file
   */
  @Get('media/:id')
  async getFileInfo(@Auth() user: any, @Param('id') id: string) {
    return this.storageService.getFileInfo(id, user.id);
  }

  /**
   * Generate presigned URL for file download
   */
  @Get('media/:id/url')
  async generatePresignedUrl(@Auth() user: any, @Param('id') id: string) {
    return this.storageService.generatePresignedUrl(id, user.id);
  }

  /**
   * Delete a file
   */
  @Delete('media/:id')
  async deleteFile(@Auth() user: any, @Param('id') id: string) {
    return this.storageService.deleteFile(id, user.id);
  }

  /**
   * Update file metadata
   */
  @Patch('media/:id')
  async updateFileMetadata(
    @Auth() user: any,
    @Param('id') id: string,
    @Body() dto: { metadata: Record<string, string> },
  ) {
    return this.storageService.updateFileMetadata(id, user.id, dto.metadata);
  }
}