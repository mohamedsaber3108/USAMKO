import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.warn('⚠️  Database connection failed, running without database:', error.message);
      // Don't throw - allow app to start without database
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
