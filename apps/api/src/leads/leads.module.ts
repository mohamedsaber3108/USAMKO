import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LinkedInWorkerService } from './workers/linkedin-worker.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';
import { MapsWorkerService } from './workers/maps-worker.service';
import { EnrichmentService } from './enrichment.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LinkedInWorkerService,
    LinkoutWorkerService,
    MapsWorkerService,
    EnrichmentService,
    PrismaService,
  ],
  exports: [LeadsService, EnrichmentService],
})
export class LeadsModule {}
