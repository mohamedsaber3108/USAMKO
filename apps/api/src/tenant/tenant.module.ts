// Tenant module for multi-tenancy support

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from './tenant.service';

@Module({
  imports: [],
  providers: [TenantService, PrismaService],
  exports: [TenantService],
})
export class TenantModule {}
