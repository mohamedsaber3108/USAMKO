// Tenant-based access control guard

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY } from '../decorators/tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTenantId = this.reflector.getAllAndOverride<string>(TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no tenant required, allow access
    if (!requiredTenantId) {
      return true;
    }

    // Check if user belongs to the required tenant
    if (user?.tenantId && user.tenantId === requiredTenantId) {
      return true;
    }

    // If user has tenantId, they can only access their own tenant's resources
    if (user?.tenantId) {
      throw new ForbiddenException('You do not have access to resources from this tenant');
    }

    return true;
  }
}
