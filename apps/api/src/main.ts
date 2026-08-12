import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as helmetModule from 'helmet';
import { RequestTimingMiddleware } from './common/middleware/request-timing.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Security headers with Helmet
  app.use(helmetModule.default());

  // Request timing middleware
  app.use(RequestTimingMiddleware.prototype.use);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 USAMKO API running on http://localhost:${port}`);
}

bootstrap();