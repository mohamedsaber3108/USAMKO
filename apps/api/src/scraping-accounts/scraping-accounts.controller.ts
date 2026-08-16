import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { ScrapingAccountsService } from './scraping-accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateScrapingAccountDto,
  TestConnectionDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('scraping-accounts')
export class ScrapingAccountsController {
  constructor(
    private readonly scrapingAccountsService: ScrapingAccountsService,
  ) {}

  /**
   * Get all scraping accounts for current user
   */
  @Get()
  async getAccounts(@Request() req) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    return this.scrapingAccountsService.getAccounts(tenantId, userId);
  }

  /**
   * Get accounts by platform
   */
  @Get('platform/:platform')
  async getAccountsByPlatform(@Request() req, @Param('platform') platform: string) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    return this.scrapingAccountsService.getAccountsByPlatform(tenantId, userId, platform);
  }

  /**
   * Create new scraping account
   */
  @Post()
  async createAccount(@Request() req, @Body() dto: CreateScrapingAccountDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    return this.scrapingAccountsService.createAccount(tenantId, userId, dto);
  }

  /**
   * Test account connection
   */
  @Post(':id/test')
  async testConnection(@Request() req, @Param('id') accountId: string) {
    const tenantId = req.user?.tenantId;
    return this.scrapingAccountsService.testConnection(accountId, tenantId);
  }

  /**
   * Set account as default
   */
  @Patch(':id/set-default')
  async setDefault(@Request() req, @Param('id') accountId: string) {
    const tenantId = req.user?.tenantId;
    await this.scrapingAccountsService.setDefault(accountId, tenantId);
    return { success: true, message: 'Account set as default' };
  }

  /**
   * Update account status
   */
  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') accountId: string,
    @Body() body: { status: 'active' | 'inactive' | 'error' },
  ) {
    const tenantId = req.user?.tenantId;
    await this.scrapingAccountsService.updateStatus(accountId, tenantId, body.status);
    return { success: true, message: 'Status updated' };
  }

  /**
   * Delete scraping account
   */
  @Delete(':id')
  async deleteAccount(@Request() req, @Param('id') accountId: string) {
    const tenantId = req.user?.tenantId;
    await this.scrapingAccountsService.deleteAccount(accountId, tenantId);
    return { success: true, message: 'Account deleted' };
  }

  /**
   * Get decrypted credentials (admin only, for debugging)
   */
  @Get(':id/credentials')
  async getCredentials(@Request() req, @Param('id') accountId: string) {
    const tenantId = req.user?.tenantId;
    const credentials = await this.scrapingAccountsService.getCredentials(accountId, tenantId);
    return { credentials };
  }
}
