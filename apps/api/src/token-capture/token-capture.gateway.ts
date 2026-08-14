import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TokenCaptureService } from './token-capture.service';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import {
  CaptureTokenDto,
  TokenCaptureResponseDto,
  ConnectionStatusDto,
} from './dto/capture-token.dto';

/**
 * WebSocket Gateway for Token Capture
 *
 * Handles real-time communication between Chrome Extension and USAMKO backend.
 * All connections must be authenticated with JWT.
 *
 * Connection URL:
 * - Development: ws://localhost:3000/token-capture?token=jwt_token
 * - Production: wss://44.205.4.211/token-capture?token=jwt_token
 *
 * Events:
 * - capture_token: Capture OAuth token from browser
 * - get_status: Get connection status and stats
 * - ping: Keep-alive ping
 *
 * @example
 * // Client connection (JavaScript)
 * const socket = io('ws://localhost:3000/token-capture', {
 *   auth: { token: 'your-jwt-token' }
 * });
 *
 * socket.emit('capture_token', {
 *   platform: 'facebook',
 *   accountId: '123456',
 *   accessToken: 'EAA...',
 * });
 *
 * socket.on('token_saved', (data) => {
 *   console.log('Token saved:', data);
 * });
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/token-capture',
})
export class TokenCaptureGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TokenCaptureGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  constructor(private readonly tokenCaptureService: TokenCaptureService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Client must be authenticated (JWT validated by guard)
      const user = client.data.user;

      if (!user) {
        this.logger.warn(`Unauthenticated connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      this.connectedClients.set(client.id, client);

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.id}, tenant: ${user.tenantId})`
      );

      // Send connection status
      const status: ConnectionStatusDto = {
        connected: true,
        userId: user.id,
        tenantId: user.tenantId,
        connectedAt: new Date(),
      };

      client.emit('connection_status', status);

      // Send stats
      const stats = await this.tokenCaptureService.getConnectionStats(
        user.tenantId
      );
      client.emit('connection_stats', stats);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    const user = client.data.user;

    if (user) {
      this.logger.log(
        `Client disconnected: ${client.id} (user: ${user.id})`
      );
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  /**
   * Handle token capture from Chrome Extension
   */
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('capture_token')
  async handleCaptureToken(
    @MessageBody() data: CaptureTokenDto,
    @ConnectedSocket() client: Socket,
  ): Promise<TokenCaptureResponseDto> {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Authentication required');
    }

    this.logger.log(
      `Token capture request: ${data.platform} from ${user.id}`
    );

    try {
      // Validate token format
      if (!this.tokenCaptureService.validateToken(data.accessToken)) {
        throw new WsException('Invalid token format');
      }

      // Capture and store token
      const result = await this.tokenCaptureService.captureToken(
        data,
        user.id,
        user.tenantId,
      );

      // Emit success event to client
      client.emit('token_saved', result);

      // Update stats
      const stats = await this.tokenCaptureService.getConnectionStats(
        user.tenantId
      );
      client.emit('connection_stats', stats);

      return result;
    } catch (error) {
      this.logger.error(
        `Token capture failed: ${error.message}`,
        error.stack
      );

      // Emit error event to client
      client.emit('token_error', {
        success: false,
        error: error.message,
        platform: data.platform,
        accountId: data.accountId,
      });

      throw new WsException(error.message);
    }
  }

  /**
   * Handle status request
   */
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('get_status')
  async handleGetStatus(
    @ConnectedSocket() client: Socket,
  ): Promise<ConnectionStatusDto> {
    const user = client.data.user;

    if (!user) {
      throw new WsException('Authentication required');
    }

    const status: ConnectionStatusDto = {
      connected: true,
      userId: user.id,
      tenantId: user.tenantId,
      connectedAt: new Date(),
    };

    return status;
  }

  /**
   * Handle ping (keep-alive)
   */
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { pong: number } {
    return { pong: Date.now() };
  }

  /**
   * Broadcast message to all clients of a tenant
   */
  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.connectedClients.forEach((client) => {
      if (client.data.user?.tenantId === tenantId) {
        client.emit(event, data);
      }
    });
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get connected clients by tenant
   */
  getConnectedClientsByTenant(tenantId: string): Socket[] {
    return Array.from(this.connectedClients.values()).filter(
      (client) => client.data.user?.tenantId === tenantId
    );
  }
}
