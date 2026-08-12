import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
    };
  }

  @Get('health/db')
  async getHealthDb() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'connected' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'disconnected', error: message };
    }
  }

  @Get('health/redis')
  async getHealthRedis() {
    try {
      const Redis = await import('ioredis');
      const redis = new Redis.default({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 3000,
      });
      const result = await redis.ping();
      await redis.quit();
      return { status: result === 'PONG' ? 'connected' : 'disconnected' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'disconnected', error: message };
    }
  }
}
