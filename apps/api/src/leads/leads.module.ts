import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LinkedInWorkerService } from './workers/linkedin-worker.service';
import { LinkedInAuthenticatedService } from './workers/linkedin-authenticated.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';
import { MapsWorkerService } from './workers/maps-worker.service';
import { EnrichmentService } from './enrichment.service';
import { ScrapingAccountsModule } from '../scraping-accounts/scraping-accounts.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ScrapingAccountsModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LinkedInWorkerService,
    LinkedInAuthenticatedService,
    LinkoutWorkerService,
    MapsWorkerService,
    EnrichmentService,
    PrismaService,
  ],
  exports: [LeadsService, EnrichmentService],
})
export class LeadsModule {}
