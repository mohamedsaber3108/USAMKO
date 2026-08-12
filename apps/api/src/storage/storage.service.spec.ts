import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock the minio Client
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue(undefined),
    removeObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest.fn().mockResolvedValue('https://minio.local/presigned-url'),
  })),
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockPrisma = {
    mediaFile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file and create database record', async () => {
      const mockFile = {
        originalname: 'test.png',
        mimetype: 'image/png',
        buffer: Buffer.from('test'),
        size: 4,
      };
      const mockMediaFile = {
        id: 'file1',
        fileName: 'uuid.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        fileSize: 4,
        storagePath: 'tenant1/user1/uuid.png',
        storageType: 'minio',
        metadata: {},
        isImage: true,
        width: null,
        height: null,
        thumbnailUrl: null,
        createdAt: new Date(),
      };
      mockPrisma.mediaFile.create.mockResolvedValue(mockMediaFile);

      const result = await service.uploadFile('user1', 'tenant1', mockFile);

      expect(result).toEqual(mockMediaFile);
      expect(mockPrisma.mediaFile.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        service.uploadFile('user1', 'tenant1', null),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file from storage and database', async () => {
      mockPrisma.mediaFile.findUnique.mockResolvedValue({
        id: 'file1',
        storagePath: 'tenant1/user1/file.png',
      });
      mockPrisma.mediaFile.delete.mockResolvedValue({ id: 'file1' });

      const result = await service.deleteFile('file1', 'user1');

      expect(result).toEqual({ message: 'File deleted successfully' });
      expect(mockPrisma.mediaFile.delete).toHaveBeenCalledWith({
        where: { id: 'file1' },
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockPrisma.mediaFile.findUnique.mockResolvedValue(null);

      await expect(service.deleteFile('nonexistent', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMediaFiles', () => {
    it('should return paginated media files', async () => {
      const mockFiles = [
        { id: 'f1', fileName: 'file1.png' },
        { id: 'f2', fileName: 'file2.jpg' },
      ];
      mockPrisma.mediaFile.findMany.mockResolvedValue(mockFiles);
      mockPrisma.mediaFile.count.mockResolvedValue(2);

      const result = await service.getMediaFiles('user1', 'tenant1', 1, 20);

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('generatePresignedUrl', () => {
    it('should generate a presigned URL for a file', async () => {
      mockPrisma.mediaFile.findUnique.mockResolvedValue({
        id: 'file1',
        originalName: 'test.png',
        storagePath: 'tenant1/user1/test.png',
      });

      const result = await service.generatePresignedUrl('file1', 'user1');

      expect(result).toHaveProperty('presignedUrl');
      expect(result).toHaveProperty('expiresAt');
      expect(result.fileId).toBe('file1');
    });

    it('should throw NotFoundException when file not found', async () => {
      mockPrisma.mediaFile.findUnique.mockResolvedValue(null);

      await expect(
        service.generatePresignedUrl('nonexistent', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1048576)).toBe('1 MB');
    });
  });
});
