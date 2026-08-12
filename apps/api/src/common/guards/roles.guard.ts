// Role-based access control guard

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no roles or permissions required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    // Check user role
    if (requiredRoles && user?.role) {
      if (requiredRoles.includes(user.role)) {
        return true;
      }
    }

    // Check user permissions
    if (requiredPermissions && user?.permissions) {
      if (requiredPermissions.some(perm => user.permissions.includes(perm))) {
        return true;
      }
    }

    throw new ForbiddenException('You do not have permission to access this resource');
  }
}
