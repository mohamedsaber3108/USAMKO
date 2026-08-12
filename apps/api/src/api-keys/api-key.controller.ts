import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { Auth } from '../common/decorators/auth.decorator';

/**
 * API Key controller for managing user API keys
 */
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key
   */
  @Post()
  async createApiKey(
    @Auth() user: any,
    @Body() dto: {
      name: string;
      description?: string;
      permissions?: string[];
      expiresAt?: string;
    },
  ) {
    const { name, description, permissions, expiresAt } = dto;

    if (!name || name.trim().length < 3) {
      throw new BadRequestException('API key name must be at least 3 characters');
    }

    return this.apiKeyService.createApiKey(
      user.id,
      name,
      description,
      permissions,
      expiresAt ? new Date(expiresAt) : undefined,
    );
  }

  /**
   * Get all API keys for the current user
   */
  @Get()
  async getUserApiKeys(@Auth() user: any) {
    return this.apiKeyService.getUserApiKeys(user.id);
  }

  /**
   * Get a specific API key by ID
   */
  @Get(':id')
  async getApiKey(@Auth() user: any, @Param('id') id: string) {
    return this.apiKeyService.getApiKey(id, user.id);
  }

  /**
   * Update an API key
   */
  @Patch(':id')
  async updateApiKey(
    @Auth() user: any,
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
      expiresAt?: string;
    },
  ) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) data.expiresAt = new Date(dto.expiresAt);

    return this.apiKeyService.updateApiKey(id, user.id, data);
  }

  /**
   * Delete an API key
   */
  @Delete(':id')
  async deleteApiKey(@Auth() user: any, @Param('id') id: string) {
    return this.apiKeyService.deleteApiKey(id, user.id);
  }

  /**
   * Revoke an API key
   */
  @Post(':id/revoke')
  async revokeApiKey(@Auth() user: any, @Param('id') id: string) {
    return this.apiKeyService.revokeApiKey(id, user.id);
  }

  /**
   * Rotate an API key
   */
  @Post(':id/rotate')
  async rotateApiKey(
    @Auth() user: any,
    @Param('id') id: string,
    @Body() dto: { name?: string },
  ) {
    return this.apiKeyService.rotateApiKey(id, user.id, dto.name);
  }
}