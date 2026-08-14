# INTEGRATION MASTER PLAN - UNIFYING ALL SYSTEMS

**Date:** 2026-08-14  
**Objective:** Unite 3 separate systems into ONE unified platform  
**Approach:** Hybrid - Integrate now, enhance progressively  
**Timeline:** Wave 1 (Months 1-2) for core integration

---

## EXECUTIVE SUMMARY

**Current State:** THREE isolated systems
1. Main USAMKO Platform (apps/api + apps/web)
2. LinkedIn Lead Collector (Python standalone)
3. Linkout Email Finder (Next.js standalone)
4. Google Maps Collector (Extension feature)

**Target State:** ONE unified platform where:
- All tools share authentication
- All data flows to central database
- Users access everything from one UI
- Workflows span all capabilities

**Strategy:** KEEP what works, CONNECT it, then ENHANCE

---

## INTEGRATION ARCHITECTURE

### Unified Architecture (Target):

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Single Login)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              UNIFIED WEB APP (Next.js)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Dashboard │Platforms │Campaigns │Workflows │  Leads   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NESTJS API GATEWAY (Unified)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           LEAD COLLECTION ORCHESTRATOR               │  │
│  │  (Routes to LinkedIn/Linkout/Maps based on source)   │  │
│  └────────┬───────────────┬──────────────┬──────────────┘  │
│           │               │              │                   │
│     ┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐           │
│     │ LinkedIn  │   │ Linkout │   │   Maps    │           │
│     │  Worker   │   │  Worker │   │  Worker   │           │
│     └───────────┘   └─────────┘   └───────────┘           │
│                                                              │
│  Existing Modules:                                          │
│  ├── Platforms (adapters)                                   │
│  ├── Campaigns (execution engine - TO BE BUILT)             │
│  ├── Workflows                                              │
│  ├── AI                                                     │
│  └── Analytics                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              UNIFIED DATABASE (PostgreSQL)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  NEW MODELS TO ADD:                                  │  │
│  │  - Lead                                              │  │
│  │  - Contact                                           │  │
│  │  - Company                                           │  │
│  │  - LeadSource                                        │  │
│  │  - LeadEnrichment                                    │  │
│  │  - EmailVerificationResult                           │  │
│  │  - CampaignExecution                                 │  │
│  │  - CampaignTarget                                    │  │
│  │  └─────────────────────────────────────────────────┘  │
│                                                              │
│  EXISTING MODELS:                                           │
│  - Tenant, User, PlatformAccount                            │
│  - Workflow, Campaign                                       │
└─────────────────────────────────────────────────────────────┘

SUPPORTING SERVICES:
├── Chrome Extension (Token + Maps data via WebSocket)
├── Background Jobs (Bull/BullMQ for async processing)
└── Redis Queue (Lead processing, enrichment, campaigns)
```

---

## INTEGRATION PLAN - 4 PHASES

### PHASE 1: DATABASE FOUNDATION (Week 1)

**Objective:** Add lead/data models to Prisma schema

**Tasks:**

1. **Update `apps/api/prisma/schema.prisma`:**

```prisma
// NEW MODELS

model Lead {
  id                String   @id @default(uuid())
  tenantId          String
  firstName         String?
  lastName          String?
  fullName          String
  email             String?
  phone             String?
  company           String?
  companyId         String?
  title             String?
  linkedinUrl       String?
  source            String   // 'linkedin', 'google_maps', 'manual', 'import'
  sourceMetadata    Json?    // Original data from source
  status            String   @default("new") // 'new', 'contacted', 'qualified', 'converted'
  score             Int?     // Lead score (0-100)
  tags              String[]
  notes             String?
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tenant            Tenant            @relation(fields: [tenantId], references: [id])
  companyData       Company?          @relation(fields: [companyId], references: [id])
  enrichments       LeadEnrichment[]
  campaignTargets   CampaignTarget[]

  @@unique([tenantId, email])
  @@index([tenantId, status])
  @@index([tenantId, source])
  @@map("leads")
}

model Company {
  id            String   @id @default(uuid())
  tenantId      String
  name          String
  domain        String?
  industry      String?
  size          String?
  location      String?
  linkedinUrl   String?
  website       String?
  phone         String?
  address       String?
  metadata      Json?    // Additional data (rating, reviews, etc.)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  leads         Lead[]

  @@unique([tenantId, domain])
  @@map("companies")
}

model LeadEnrichment {
  id            String   @id @default(uuid())
  leadId        String
  enrichmentType String  // 'email_verification', 'phone_validation', 'social_profile'
  provider      String   // 'hunter', 'clearbit', 'internal'
  result        Json     // Enrichment data
  confidence    Float?   // Confidence score (0-1)
  createdAt     DateTime @default(now())

  lead          Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId])
  @@map("lead_enrichments")
}

model CampaignExecution {
  id            String    @id @default(uuid())
  campaignId    String
  status        String    @default("pending") // 'pending', 'running', 'completed', 'failed'
  startedAt     DateTime?
  completedAt   DateTime?
  targetsTotal  Int       @default(0)
  targetsSent   Int       @default(0)
  targetsFailed Int       @default(0)
  results       Json?
  error         String?
  metadata      Json?

  campaign      Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  targets       CampaignTarget[]

  @@map("campaign_executions")
}

model CampaignTarget {
  id            String    @id @default(uuid())
  executionId   String
  leadId        String
  status        String    @default("pending") // 'pending', 'sent', 'failed', 'bounced', 'replied'
  sentAt        DateTime?
  failedAt      DateTime?
  error         String?
  metadata      Json?

  execution     CampaignExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  lead          Lead              @relation(fields: [leadId], references: [id])

  @@index([executionId])
  @@index([leadId])
  @@map("campaign_targets")
}

// UPDATE EXISTING MODELS

model Campaign {
  // ... existing fields ...
  executions    CampaignExecution[]
}

model Tenant {
  // ... existing fields ...
  leads         Lead[]
  companies     Company[]
}
```

2. **Run migration:**
```bash
npx prisma migrate dev --name add_lead_pipeline_models
npx prisma generate
```

3. **Verify:**
```bash
npm run test -- prisma.service.spec.ts
```

**Deliverable:** ✅ Database ready for lead data

---

### PHASE 2: BACKEND API INTEGRATION (Week 2-3)

**Objective:** Create unified Lead API that integrates all collection tools

#### Task 2.1: Create Lead Module

**File:** `apps/api/src/leads/leads.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LinkedInWorkerService } from './workers/linkedin-worker.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';
import { MapsWorkerService } from './workers/maps-worker.service';
import { EnrichmentService } from './enrichment.service';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LinkedInWorkerService,
    LinkoutWorkerService,
    MapsWorkerService,
    EnrichmentService,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
```

#### Task 2.2: LinkedIn Worker Service

**File:** `apps/api/src/leads/workers/linkedin-worker.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as xlsx from 'xlsx';

const execAsync = promisify(exec);

@Injectable()
export class LinkedInWorkerService {
  private linkedInScriptPath = 'C:/Users/moham/Desktop/linkedin-lead-collector-fixed (1)';

  async discoverCompanies(params: {
    industry: string;
    location: string;
    maxCompanies: number;
  }): Promise<any[]> {
    // Call Python script
    const command = `cd "${this.linkedInScriptPath}" && python discover_companies.py --industry "${params.industry}" --location "${params.location}" --max ${params.maxCompanies}`;
    
    try {
      const { stdout } = await execAsync(command);
      
      // Find output Excel file
      const outputFiles = await fs.readdir(this.linkedInScriptPath);
      const latestExcel = outputFiles
        .filter(f => f.startsWith('companies_') && f.endsWith('.xlsx'))
        .sort()
        .reverse()[0];
      
      if (!latestExcel) {
        throw new Error('No output file generated');
      }
      
      // Read Excel and convert to JSON
      const workbook = xlsx.readFile(`${this.linkedInScriptPath}/${latestExcel}`);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const companies = xlsx.utils.sheet_to_json(sheet);
      
      return companies;
    } catch (error) {
      throw new Error(`LinkedIn discovery failed: ${error.message}`);
    }
  }

  async searchPeople(params: {
    companies: string[];
    roles: string[];
    maxPerCompany: number;
  }): Promise<any[]> {
    // Similar implementation for search_role_at_company.py
    // ...
  }
}
```

#### Task 2.3: Linkout Worker Service

**File:** `apps/api/src/leads/workers/linkout-worker.service.ts`

```typescript
import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkoutWorkerService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async findEmail(params: {
    fullName: string;
    firstName?: string;
    lastName?: string;
    domain: string;
    company?: string;
  }): Promise<{
    email: string;
    score: number;
    sources: any[];
  }> {
    const hunterApiKey = this.configService.get('HUNTER_API_KEY');
    
    // Call Hunter.io API directly (same as Linkout does)
    const response = await this.httpService.post(
      'https://api.hunter.io/v2/email-finder',
      {
        ...params,
        api_key: hunterApiKey,
      },
    ).toPromise();
    
    if (response.data?.data?.email) {
      return {
        email: response.data.data.email,
        score: response.data.data.score,
        sources: response.data.data.sources || [],
      };
    }
    
    throw new Error('Email not found');
  }

  async verifyEmail(email: string): Promise<{
    valid: boolean;
    score: number;
  }> {
    // Email verification logic
    // ...
  }
}
```

#### Task 2.4: Maps Worker Service

**File:** `apps/api/src/leads/workers/maps-worker.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { TokenCaptureGateway } from '../../token-capture/token-capture.gateway';

@Injectable()
export class MapsWorkerService {
  constructor(
    private tokenCaptureGateway: TokenCaptureGateway,
  ) {}

  async collectFromMaps(params: {
    searchQuery: string;
    location?: string;
    maxResults: number;
  }): Promise<any[]> {
    // Send command to Chrome extension to collect Google Maps data
    // Extension sends results back via WebSocket
    
    return new Promise((resolve, reject) => {
      const collectionId = `maps_${Date.now()}`;
      
      // Emit command to extension
      this.tokenCaptureGateway.server.emit('collect_maps_data', {
        collectionId,
        ...params,
      });
      
      // Listen for results
      const timeout = setTimeout(() => {
        reject(new Error('Maps collection timeout'));
      }, 300000); // 5 minutes
      
      this.tokenCaptureGateway.server.on(`maps_data_${collectionId}`, (data) => {
        clearTimeout(timeout);
        resolve(data.businesses);
      });
    });
  }
}
```

#### Task 2.5: Unified Leads Service

**File:** `apps/api/src/leads/leads.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { LinkedInWorkerService } from './workers/linkedin-worker.service';
import { LinkoutWorkerService } from './workers/linkout-worker.service';
import { MapsWorkerService } from './workers/maps-worker.service';
import { EnrichmentService } from './enrichment.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private linkedInWorker: LinkedInWorkerService,
    private linkoutWorker: LinkoutWorkerService,
    private mapsWorker: MapsWorkerService,
    private enrichment: EnrichmentService,
  ) {}

  // UNIFIED COLLECTION ENDPOINT
  async collectLeads(tenantId: string, params: {
    source: 'linkedin' | 'google_maps';
    sourceParams: any;
    enrichWithEmail?: boolean;
    autoScore?: boolean;
  }) {
    let rawLeads: any[] = [];
    
    // Step 1: Collect from source
    if (params.source === 'linkedin') {
      // Collect companies
      const companies = await this.linkedInWorker.discoverCompanies(
        params.sourceParams,
      );
      
      // Collect people at companies
      const people = await this.linkedInWorker.searchPeople({
        companies: companies.map(c => c.name),
        roles: params.sourceParams.roles || ['Founder', 'CEO'],
        maxPerCompany: params.sourceParams.maxPerCompany || 2,
      });
      
      rawLeads = people;
    } else if (params.source === 'google_maps') {
      const businesses = await this.mapsWorker.collectFromMaps(
        params.sourceParams,
      );
      rawLeads = businesses;
    }
    
    // Step 2: Enrich with emails if requested
    if (params.enrichWithEmail) {
      for (const lead of rawLeads) {
        try {
          const emailResult = await this.linkoutWorker.findEmail({
            fullName: lead.name || lead.fullName,
            domain: lead.domain || lead.website,
            company: lead.company,
          });
          lead.email = emailResult.email;
          lead.emailScore = emailResult.score;
        } catch (error) {
          // Email not found, continue
        }
      }
    }
    
    // Step 3: Save to database
    const savedLeads = [];
    for (const rawLead of rawLeads) {
      const lead = await this.prisma.lead.create({
        data: {
          tenantId,
          fullName: rawLead.name || rawLead.fullName,
          firstName: rawLead.firstName,
          lastName: rawLead.lastName,
          email: rawLead.email,
          phone: rawLead.phone,
          company: rawLead.company,
          title: rawLead.title || rawLead.role,
          linkedinUrl: rawLead.linkedinUrl || rawLead.profileUrl,
          source: params.source,
          sourceMetadata: rawLead,
          status: 'new',
        },
      });
      
      savedLeads.push(lead);
    }
    
    // Step 4: Auto-score if requested
    if (params.autoScore) {
      await this.enrichment.scoreLeads(savedLeads.map(l => l.id));
    }
    
    return savedLeads;
  }

  // CRUD operations
  async findAll(tenantId: string, filters?: any) {
    return this.prisma.lead.findMany({
      where: { tenantId, ...filters },
      include: {
        companyData: true,
        enrichments: true,
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.lead.findUnique({
      where: { id, tenantId },
      include: {
        companyData: true,
        enrichments: true,
        campaignTargets: true,
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    return this.prisma.lead.update({
      where: { id, tenantId },
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.lead.delete({
      where: { id, tenantId },
    });
  }
}
```

#### Task 2.6: REST API Controller

**File:** `apps/api/src/leads/leads.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenant/tenant.decorator';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post('collect')
  async collectLeads(
    @CurrentTenant() tenantId: string,
    @Body() body: {
      source: 'linkedin' | 'google_maps';
      sourceParams: any;
      enrichWithEmail?: boolean;
      autoScore?: boolean;
    },
  ) {
    return this.leadsService.collectLeads(tenantId, body);
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() filters: any,
  ) {
    return this.leadsService.findAll(tenantId, filters);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.leadsService.findOne(id, tenantId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() data: any,
  ) {
    return this.leadsService.update(id, tenantId, data);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.leadsService.delete(id, tenantId);
  }
}
```

**Deliverable:** ✅ Unified backend API for lead collection

---

### PHASE 3: FRONTEND INTEGRATION (Week 4)

**Objective:** Add Lead Management UI to web app

**Tasks:**

1. Create `/leads` page
2. Lead collection wizard (source selection → configuration → preview → collect)
3. Lead list/table with filters
4. Lead detail view with enrichment data
5. Export leads functionality
6. Bulk actions (tag, delete, export)

**Deliverable:** ✅ Users can collect & manage leads from unified UI

---

### PHASE 4: CAMPAIGN EXECUTION ENGINE (Week 5-6)

**Objective:** Enable campaigns to actually run and target collected leads

**File:** `apps/api/src/campaigns/execution.service.ts`

```typescript
// Campaign execution logic that:
// 1. Takes campaign configuration
// 2. Selects leads based on targeting criteria
// 3. Generates messages using AI
// 4. Sends via platform adapters
// 5. Tracks results
```

**Deliverable:** ✅ End-to-end workflow working

---

## MIGRATION PATH

### For Existing Users:

1. **LinkedIn Tool Users:**
   - Export existing Excel files
   - Import via new `/leads/import` endpoint
   - Future collections use integrated system

2. **Linkout Users:**
   - No migration needed
   - Linkout becomes backend worker
   - Same Hunter.io API key used

3. **Google Maps Users:**
   - Update Chrome extension
   - Data now syncs to platform DB automatically
   - Historical CSV can be imported

---

## TESTING STRATEGY

### Integration Tests:

1. **LinkedIn Integration Test:**
   - Collect 5 companies
   - Verify in database
   - Check data format

2. **Email Finding Test:**
   - Find emails for 5 leads
   - Verify confidence scores
   - Check enrichment records

3. **Maps Integration Test:**
   - Collect 10 businesses
   - Verify all fields
   - Check company creation

4. **End-to-End Test:**
   - Collect LinkedIn leads
   - Enrich with emails
   - Create campaign
   - Send to leads
   - Verify delivery

---

## ROLLOUT PLAN

### Week 1: Database
- Add models
- Run migrations
- Test data integrity

### Week 2-3: Backend
- Create Lead module
- Implement workers
- Test each integration

### Week 4: Frontend
- Build Lead pages
- Collection wizard
- Management UI

### Week 5-6: Campaigns
- Execution engine
- Targeting system
- Results tracking

### Week 7: Testing
- Integration tests
- End-to-end tests
- User acceptance testing

### Week 8: Deployment
- Staging deployment
- Production deployment
- User migration

---

## SUCCESS METRICS

- ✅ All 3 systems accessible from one login
- ✅ Lead data persists to central database
- ✅ Campaign execution uses collected leads
- ✅ Zero manual export/import required
- ✅ < 2 second latency for data sync
- ✅ 100% data preservation during migration

---

**Date:** 2026-08-14  
**Phase 4 Status:** ✅ INTEGRATION PLAN COMPLETE
