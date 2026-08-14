import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { WorkflowService } from '../workflow/workflow.service';

/**
 * Workflow Scheduler Service
 * Handles cron-based workflow execution
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * Check for scheduled workflows every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for scheduled workflows...');

    const now = new Date();
    const schedules = await this.prisma.workflowSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now,
        },
      },
    });

    for (const schedule of schedules) {
      try {
        this.logger.log(`Executing scheduled workflow: ${schedule.workflowId}`);
        
        // Execute the workflow
        await this.workflowService.executeWorkflow(schedule.workflowId);

        // Update last run time
        const nextRunAt = this.calculateNextRun(schedule.cronExpr);
        await this.prisma.workflowSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to execute scheduled workflow ${schedule.workflowId}:`,
          error,
        );
      }
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private calculateNextRun(cronExpr: string): Date {
    // Simple implementation - in production, use a cron parser library
    // For now, add 1 hour to current time
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    tenantId: string,
    workflowId: string,
    cronExpr: string,
  ) {
    const nextRunAt = this.calculateNextRun(cronExpr);

    return this.prisma.workflowSchedule.create({
      data: {
        tenantId,
        workflowId,
        cronExpr,
        nextRunAt,
        enabled: true,
      },
    });
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(id: string, cronExpr: string) {
    const nextRunAt = this.calculateNextRun(cronExpr);

    return this.prisma.workflowSchedule.update({
      where: { id },
      data: {
        cronExpr,
        nextRunAt,
      },
    });
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string) {
    return this.prisma.workflowSchedule.delete({
      where: { id },
    });
  }

  /**
   * Enable/disable a schedule
   */
  async toggleSchedule(id: string, enabled: boolean) {
    return this.prisma.workflowSchedule.update({
      where: { id },
      data: { enabled },
    });
  }

  /**
   * Get all schedules
   */
  async getAllSchedules() {
    return this.prisma.workflowSchedule.findMany({
      include: { workflow: true },
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string) {
    return this.prisma.workflowSchedule.findUnique({
      where: { id },
      include: { workflow: true },
    });
  }

  /**
   * Process scheduled jobs (manual trigger)
   */
  async processScheduledJobs() {
    this.logger.log('Processing scheduled jobs...');
    return this.handleCron();
  }
}
