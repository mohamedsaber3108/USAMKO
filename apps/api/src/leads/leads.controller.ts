import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, CollectLeadsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Request() req, @Body() createLeadDto: CreateLeadDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.create(tenantId, createLeadDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.findAll(tenantId, {
      source,
      status,
      minScore: minScore ? parseInt(minScore) : undefined,
      maxScore: maxScore ? parseInt(maxScore) : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.findOne(tenantId, id);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.update(tenantId, id, updateLeadDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.remove(tenantId, id);
  }

  @Post('collect')
  collect(@Request() req, @Body() collectDto: CollectLeadsDto) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    return this.leadsService.collect(tenantId, collectDto);
  }
}
