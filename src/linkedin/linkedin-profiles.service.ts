import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedInProfile } from '@prisma/client';

@Injectable()
export class LinkedInProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update LinkedIn profile
   */
  async createOrUpdate(
    tenantId: string,
    userId: string,
    data: {
      publicIdentifier: string;
      firstName: string;
      lastName: string;
      headline?: string;
      location?: string;
      profileUrl: string;
      photoUrl?: string;
    },
  ): Promise<LinkedInProfile> {
    const dataHash = this.generateHash(data);

    return this.prisma.linkedInProfile.upsert({
      where: {
        publicIdentifier: data.publicIdentifier,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        location: data.location,
        photoUrl: data.photoUrl,
        lastScraped: new Date(),
        dataHash,
        rawData: data,
      },
      create: {
        tenantId,
        userId,
        publicIdentifier: data.publicIdentifier,
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        location: data.location,
        profileUrl: data.profileUrl,
        photoUrl: data.photoUrl,
        dataHash,
        rawData: data,
      },
    });
  }

  /**
   * Find profile by public identifier
   */
  async findByPublicIdentifier(
    tenantId: string,
    publicIdentifier: string,
  ): Promise<LinkedInProfile | null> {
    return this.prisma.linkedInProfile.findFirst({
      where: {
        tenantId,
        publicIdentifier,
      },
      include: {
        posts: {
          orderBy: { postedAt: 'desc' },
          take: 10,
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Find all profiles for tenant with optional filters
   */
  async findAll(
    tenantId: string,
    filters?: {
      isConnected?: boolean;
      location?: string;
    },
  ) {
    return this.prisma.linkedInProfile.findMany({
      where: {
        tenantId,
        ...(filters?.isConnected !== undefined && {
          isConnected: filters.isConnected,
        }),
        ...(filters?.location && {
          location: {
            contains: filters.location,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: {
        lastScraped: 'desc',
      },
      include: {
        _count: {
          select: {
            posts: true,
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Mark profile as connected
   */
  async markAsConnected(
    tenantId: string,
    publicIdentifier: string,
    connectionNote?: string,
  ): Promise<LinkedInProfile> {
    return this.prisma.linkedInProfile.update({
      where: {
        publicIdentifier,
      },
      data: {
        isConnected: true,
        connectionDate: new Date(),
        connectionNote,
      },
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(tenantId: string) {
    const [total, connected, recentlyScraped] = await Promise.all([
      this.prisma.linkedInProfile.count({
        where: { tenantId },
      }),
      this.prisma.linkedInProfile.count({
        where: { tenantId, isConnected: true },
      }),
      this.prisma.linkedInProfile.count({
        where: {
          tenantId,
          lastScraped: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      total,
      connected,
      recentlyScraped,
    };
  }

  /**
   * Delete profile
   */
  async delete(tenantId: string, publicIdentifier: string): Promise<void> {
    await this.prisma.linkedInProfile.delete({
      where: {
        publicIdentifier,
      },
    });
  }

  /**
   * Generate hash of profile data for change detection
   */
  private generateHash(data: any): string {
    const crypto = require('crypto');
    const str = JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex');
  }
}
