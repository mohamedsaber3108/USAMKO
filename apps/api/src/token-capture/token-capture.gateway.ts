import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { TokenCaptureService } from './token-capture.service';
import { PrismaService } from '../prisma.service';
import { parse } from 'url';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ path: '/token-capture' })
export class TokenCaptureGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: any;

  private readonly logger = new Logger(TokenCaptureGateway.name);
  private readonly clients = new Map<any, { userId: string; tenantId: string }>();

  constructor(
    private readonly tokenCaptureService: TokenCaptureService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: any, ...args: any[]) {
    try {
      const request = args[0];
      const { query } = parse(request?.url || '', true);
      const token = query.token as string;

      if (!token) {
        this.logger.warn('Connection rejected: No token');
        client.close(1008, 'No token provided');
        return;
      }

      const secret = process.env.JWT_SECRET;
      this.logger.log(`Verifying token (${token.substring(0, 20)}...) with secret (${secret?.substring(0, 6)}...)`);

      if (!secret) {
        this.logger.error('JWT_SECRET not found in environment!');
        client.close(1008, 'Server configuration error');
        return;
      }

      const payload = jwt.verify(token, secret) as any;

      const userId = payload.sub || payload.userId;

      let tenantId = payload.tenantId;
      if (!tenantId && userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true },
        });
        tenantId = user?.tenantId || userId;
      }

      this.clients.set(client, { userId, tenantId });
      this.logger.log(`Client connected: userId=${userId}, tenantId=${tenantId}`);

      this.send(client, 'connection_status', {
        connected: true,
        message: 'Connected to USAMKO',
      });

      const stats = await this.tokenCaptureService.getConnectionStats(tenantId);
      this.send(client, 'connection_stats', stats);

      client.on('message', (raw: any) => this.handleMessage(client, raw));
    } catch (error) {
      this.logger.error(`Auth failed: ${error.message}`);
      client.close(1008, 'Authentication failed');
    }
  }

  handleDisconnect(client: any) {
    const info = this.clients.get(client);
    if (info) {
      this.logger.log(`Client disconnected: userId=${info.userId}`);
      this.clients.delete(client);
    }
  }

  private async handleMessage(client: any, raw: any) {
    const info = this.clients.get(client);
    if (!info) {
      this.send(client, 'error', { message: 'Not authenticated' });
      return;
    }

    try {
      const message = JSON.parse(raw.toString());

      switch (message.event) {
        case 'capture_token':
          await this.handleCaptureToken(client, info, message.data);
          break;
        case 'ping':
          this.send(client, 'pong', { timestamp: Date.now() });
          break;
        default:
          this.logger.warn(`Unknown event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error('Message handling failed:', error.message);
      this.send(client, 'error', { message: 'Invalid message format' });
    }
  }

  private async handleCaptureToken(
    client: any,
    info: { userId: string; tenantId: string },
    data: any,
  ) {
    try {
      const result = await this.tokenCaptureService.captureToken(
        data,
        info.userId,
        info.tenantId,
      );

      this.send(client, 'token_saved', result);

      const stats = await this.tokenCaptureService.getConnectionStats(info.tenantId);
      this.send(client, 'connection_stats', stats);
    } catch (error) {
      this.logger.error('Token capture failed:', error.message);
      this.send(client, 'token_error', {
        error: error.message,
        platform: data?.platform,
      });
    }
  }

  private send(client: any, event: string, data: any) {
    try {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event, data }));
      }
    } catch (e) {
      // Client may have disconnected
    }
  }
}
