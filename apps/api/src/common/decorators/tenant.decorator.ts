// Tenant-based access control decorators

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TENANT_KEY = 'tenant';
export const TenantMeta = (tenantId?: string) => SetMetadata(TENANT_KEY, tenantId);

export const Tenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.user?.tenant || request.tenant || { id: request.user?.tenantId };
    return data ? tenant?.[data] : tenant;
  },
);

export const CurrentTenant = () => {
  const decorator = SetMetadata(TENANT_KEY, undefined);
  return decorator;
};
