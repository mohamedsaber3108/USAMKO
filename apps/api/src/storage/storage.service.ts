import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Client } from 'minio';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * MinIO Storage service for file uploads and management
 */
@Injectable()
export class StorageService {
  private minioClient: Client;
  private readonly bucketName: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucketName = process.env.MINIO_BUCKET || 'usamko-files';

    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    // Create bucket if it doesn't exist
    this.ensureBucketExists();
  }

  /**
   * Ensure the bucket exists
   */
  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    userId: string,
    tenantId: string,
    file: any,
    metadata?: Record<string, string>,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const storagePath = `${tenantId}/${userId}/${fileName}`;

    try {
      // Upload to MinIO
      await this.minioClient.putObject(
        this.bucketName,
        storagePath,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          ...metadata,
        },
      );

      // Create database record
      const mediaFile = await this.prisma.mediaFile.create({
        data: {
          tenantId,
          userId,
          fileName,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          storagePath,
          storageType: 'minio',
          metadata: metadata || {},
          tags: [],
          isImage: file.mimetype.startsWith('image/'),
        },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          storagePath: true,
          storageType: true,
          metadata: true,
          isImage: true,
          width: true,
          height: true,
          thumbnailUrl: true,
          createdAt: true,
        },
      });

      return mediaFile;
    } catch (error: any) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate a presigned URL for file access
   */
  async generatePresignedUrl(fileId: string, userId: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: fileId, userId },
    });

    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    // Generate presigned URL (expires in 1 hour)
    const presignedUrl = await this.minioClient.presignedGetObject(
      this.bucketName,
      mediaFile.storagePath,
      3600,
    );

    return {
      fileId: mediaFile.id,
      fileName: mediaFile.originalName,
      presignedUrl,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  /**
   * Get all media files for a user
   */
  async getMediaFiles(userId: string, tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      this.prisma.mediaFile.findMany({
        where: { userId, tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          storagePath: true,
          storageType: true,
          metadata: true,
          isImage: true,
          width: true,
          height: true,
          thumbnailUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.mediaFile.count({
        where: { userId, tenantId },
      }),
    ]);

    return {
      files,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a media file
   */
  async deleteFile(fileId: string, userId: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: fileId, userId },
    });

    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    try {
      // Delete from MinIO
      await this.minioClient.removeObject(
        this.bucketName,
        mediaFile.storagePath,
      );

      // Delete from database
      await this.prisma.mediaFile.delete({
        where: { id: fileId },
      });

      return { message: 'File deleted successfully' };
    } catch (error: any) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(fileId: string, userId: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: fileId, userId },
    });

    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    return mediaFile;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    userId: string,
    metadata: Record<string, string>,
  ) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: fileId, userId },
    });

    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    const updated = await this.prisma.mediaFile.update({
      where: { id: fileId },
      data: { metadata },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        storagePath: true,
        storageType: true,
        metadata: true,
        isImage: true,
        width: true,
        height: true,
        thumbnailUrl: true,
        createdAt: true,
      },
    });

    return updated;
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}