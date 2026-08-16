import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/decorators/roles.decorator';
import { Tenant as TenantDecorator } from '../common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  getAllSchedules() {
    return this.schedulerService['getAllSchedules']();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  getScheduleById(@Param('id') id: string) {
    return this.schedulerService['getScheduleById'](id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  createSchedule(
    @TenantDecorator('id') tenantId: string,
    @Body() dto: { workflowId: string; cronExpression: string; enabled?: boolean },
  ) {
    return this.schedulerService['createSchedule'](tenantId, dto.workflowId, dto.cronExpression);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: Partial<{ cronExpression: string; enabled: boolean }>,
  ) {
    return this.schedulerService['updateSchedule'](id, dto.cronExpression!);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  deleteSchedule(@Param('id') id: string) {
    return this.schedulerService['deleteSchedule'](id);
  }

  @Post(':id/toggle')
  @Roles(UserRole.ADMIN, UserRole.USER)
  toggleSchedule(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.schedulerService['toggleSchedule'](id, enabled);
  }

  @Post('process')
  @Roles(UserRole.ADMIN)
  processScheduledJobs() {
    return this.schedulerService['processScheduledJobs']();
  }
}