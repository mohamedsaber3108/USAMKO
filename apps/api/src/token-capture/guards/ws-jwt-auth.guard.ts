import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();

    try {
      const user = client._user;
      if (!user) {
        throw new WsException('Authentication required');
      }
      return true;
    } catch (error) {
      throw new WsException('Invalid authentication token');
    }
  }
}
