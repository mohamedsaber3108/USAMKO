import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/decorators/roles.decorator';
type Response = any;

// DTOs
export class GenerateCampaignReportDto {
  campaignId!: string;
  startDate?: string;
  endDate?: string;
}

export class GeneratePlatformReportDto {
  platform!: string;
  startDate?: string;
  endDate?: string;
}

export class GenerateEngagementReportDto {
  startDate?: string;
  endDate?: string;
}

export class ScheduleReportDto {
  name!: string;
  type!: 'campaign' | 'platform' | 'engagement';
  platform?: string;
  campaignId?: string;
  frequency!: 'daily' | 'weekly' | 'monthly';
  recipients!: string[];
  format!: 'pdf' | 'excel';
  enabled?: boolean;
}

@ApiTags('Reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Generate campaign report
   */
  @Post('campaign/:id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Generate campaign report' })
  @ApiResponse({ status: 200, description: 'Campaign report generated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async generateCampaignReport(
    @Param('id') campaignId: string,
    @Body() dto?: GenerateCampaignReportDto,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    const dateRange = dto
      ? {
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        }
      : undefined;

    return this.reportService.generateCampaignReport(tenantId, campaignId, dateRange);
  }

  /**
   * Generate platform report
   */
  @Post('platform/:platform')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Generate platform report' })
  @ApiResponse({ status: 200, description: 'Platform report generated successfully' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  async generatePlatformReport(
    @Param('platform') platform: string,
    @Body() dto?: GeneratePlatformReportDto,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    const dateRange = dto
      ? {
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        }
      : undefined;

    return this.reportService.generatePlatformReport(tenantId, platform, dateRange);
  }

  /**
   * Generate engagement report
   */
  @Post('engagement')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Generate engagement report' })
  @ApiResponse({ status: 200, description: 'Engagement report generated successfully' })
  async generateEngagementReport(
    @Body() dto?: GenerateEngagementReportDto,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    const dateRange = dto
      ? {
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
        }
      : undefined;

    return this.reportService.generateEngagementReport(tenantId, dateRange);
  }

  /**
   * Download report
   */
  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/octet-stream')
  @ApiOperation({ summary: 'Download report' })
  @ApiResponse({ status: 200, description: 'Report downloaded successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async downloadReport(
    @Param('id') id: string,
    @Query('format') format?: 'pdf' | 'excel' | 'csv',
    @Res() response?: Response,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    const report = await this.reportService.getReport(tenantId, id);

    if (!report) {
      throw new BadRequestException('Report not found');
    }

    let buffer: Buffer;
    let contentType: string;
    let fileName: string;

    if (report.format === 'PDF' || format === 'pdf') {
      buffer = await this.reportService.exportToPDF(report.data, report.type);
      contentType = 'application/pdf';
      fileName = `${report.name}.pdf`;
    } else {
      buffer = await this.reportService.exportToExcel(report.data, report.type);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `${report.name}.xlsx`;
    }

    if (response) {
      response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      response.setHeader('Content-Type', contentType);
      response.send(buffer);
      return;
    }

    return {
      buffer: buffer.toString('base64'),
      contentType,
      fileName,
    };
  }

  /**
   * Schedule automated report
   */
  @Post('schedule')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Schedule automated report' })
  @ApiResponse({ status: 201, description: 'Report scheduled successfully' })
  async scheduleReport(@Body() dto: ScheduleReportDto) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.scheduleReport(tenantId, {
      ...dto,
      enabled: dto.enabled ?? true,
    });
  }

  /**
   * Get all scheduled reports
   */
  @Get('schedules')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get all scheduled reports' })
  @ApiResponse({ status: 200, type: [Object] })
  async getScheduledReports() {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.getScheduledReports(tenantId);
  }

  /**
   * Get scheduled report by ID
   */
  @Get('schedules/:id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get scheduled report by ID' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async getScheduledReport(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.getScheduledReport(tenantId, id);
  }

  /**
   * Update scheduled report
   */
  @Patch('schedules/:id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Update scheduled report' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async updateScheduledReport(
    @Param('id') id: string,
    @Body() dto: Partial<ScheduleReportDto>,
  ) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.updateScheduledReport(tenantId, id, dto);
  }

  /**
   * Delete scheduled report
   */
  @Delete('schedules/:id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Delete scheduled report' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  async deleteScheduledReport(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.deleteScheduledReport(tenantId, id);
  }

  /**
   * Toggle scheduled report
   */
  @Post('schedules/:id/toggle')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Toggle scheduled report' })
  @ApiResponse({ status: 200, type: Object })
  async toggleScheduledReport(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.toggleScheduledReport(tenantId, id, enabled);
  }

  /**
   * Get all generated reports
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get all generated reports' })
  @ApiResponse({ status: 200, type: [Object] })
  async getGeneratedReports() {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.getGeneratedReports(tenantId);
  }

  /**
   * Get report by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, type: Object })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.getReport(tenantId, id);
  }

  /**
   * Delete generated report
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Delete generated report' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  async deleteReport(@Param('id') id: string) {
    const tenantId = 'default_tenant_id'; // In production, get from auth context
    return this.reportService.deleteReport(tenantId, id);
  }
}