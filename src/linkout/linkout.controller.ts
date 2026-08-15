import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LinkoutService } from './linkout.service';

@Controller('linkout')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is set up
export class LinkoutController {
  constructor(private readonly linkoutService: LinkoutService) {}

  /**
   * Find email for single person (100% FREE)
   */
  @Post('find-email')
  async findEmail(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      firstName: string;
      lastName: string;
      company: string;
      domain?: string;
      leadId?: string;
    },
  ) {
    return this.linkoutService.findAndSave(
      body.tenantId,
      body.userId,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        company: body.company,
        domain: body.domain,
        leadId: body.leadId,
      },
    );
  }

  /**
   * Find emails in bulk (100% FREE, UNLIMITED)
   */
  @Post('find-bulk')
  async findBulk(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      leads: Array<{
        firstName: string;
        lastName: string;
        company: string;
        domain?: string;
        leadId?: string;
      }>;
    },
  ) {
    return this.linkoutService.findBulk(
      body.tenantId,
      body.userId,
      body.leads,
    );
  }

  /**
   * Get email finder results for a lead
   */
  @Get('results/lead/:leadId')
  async getResultsByLead(
    @Query('tenantId') tenantId: string,
    @Param('leadId') leadId: string,
  ) {
    return this.linkoutService.getResultsByLead(tenantId, leadId);
  }

  /**
   * Get all email finder results
   */
  @Get('results')
  async getAllResults(
    @Query('tenantId') tenantId: string,
    @Query('verified') verified?: string,
    @Query('hasEmail') hasEmail?: string,
  ) {
    return this.linkoutService.getAllResults(tenantId, {
      verified: verified === 'true' ? true : undefined,
      hasEmail: hasEmail === 'true' ? true : undefined,
    });
  }

  /**
   * Get statistics
   */
  @Get('statistics')
  async getStatistics(@Query('tenantId') tenantId: string) {
    return this.linkoutService.getStatistics(tenantId);
  }

  /**
   * Enrich existing lead with email
   */
  @Post('enrich-lead/:leadId')
  async enrichLead(
    @Body() body: { tenantId: string; userId: string },
    @Param('leadId') leadId: string,
  ) {
    return this.linkoutService.enrichLead(
      body.tenantId,
      body.userId,
      leadId,
    );
  }
}
