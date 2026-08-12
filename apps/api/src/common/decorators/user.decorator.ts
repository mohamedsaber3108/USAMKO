// User decorator with permissions support

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user) return undefined;

  // If data is provided, return specific property
  if (data) {
    return user[data];
  }

  // Return user with permissions
  return {
    ...user,
    permissions: getUserPermissions(user.role),
  };
});

// Helper: Get permissions based on role
function getUserPermissions(role: string): string[] {
  switch (role) {
    case 'ADMIN':
      return ['create', 'read', 'update', 'delete', 'manage'];
    case 'USER':
      return ['create', 'read', 'update'];
    case 'VIEWER':
      return ['read'];
    default:
      return [];
  }
}
