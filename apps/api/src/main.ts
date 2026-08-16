import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import * as helmetModule from 'helmet';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Security headers with Helmet
  app.use(helmetModule.default());

  // Request timing
  const timingLogger = new Logger('RequestTiming');
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      timingLogger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global audit interceptor (Phase 1 Security)
  const auditService = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(auditService));
  Logger.log('✅ Audit logging enabled');

  // Enable raw WebSocket support for token-capture gateway
  app.useWebSocketAdapter(new WsAdapter(app));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 USAMKO API running on http://localhost:${port}`);
}

bootstrap();