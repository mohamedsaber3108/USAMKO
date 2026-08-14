import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket JWT Authentication Guard
 *
 * Validates JWT token from WebSocket connection handshake.
 * Token can be provided in:
 * - Query parameter: ?token=jwt_token
 * - Authorization header: Bearer jwt_token
 *
 * Usage:
 * @UseGuards(WsJwtAuthGuard)
 * @SubscribeMessage('event_name')
 * handleEvent(@MessageBody() data: any, @ConnectedSocket() client: Socket) {}
 */
@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    try {
      // Extract token from query or handshake auth
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Authentication token not found');
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-jwt-secret',
      });

      // Attach user to client data for later use
      client.data.user = {
        id: payload.sub || payload.userId,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      throw new WsException('Invalid authentication token');
    }
  }

  /**
   * Extract JWT token from WebSocket connection
   */
  private extractToken(client: Socket): string | null {
    // Try query parameter first
    const queryToken = client.handshake.query?.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Try authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try auth object (socket.io specific)
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    return null;
  }
}
