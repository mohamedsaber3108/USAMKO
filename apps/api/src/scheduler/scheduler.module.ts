import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../prisma.service';
import { WorkflowService } from '../workflow/workflow.service';

@Module({
  providers: [SchedulerService, PrismaService, WorkflowService],
  exports: [SchedulerService],
})
export class SchedulerModule {}