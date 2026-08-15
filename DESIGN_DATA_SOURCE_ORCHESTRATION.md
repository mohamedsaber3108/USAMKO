# 🔄 DATA SOURCE ORCHESTRATION - Complete Design Specification

**Date:** 2026-08-15  
**Priority:** HIGH - Required for Production  
**Estimated Effort:** 3-4 weeks  
**Status:** DESIGN COMPLETE - Ready for Implementation

---

## 📋 EXECUTIVE SUMMARY

Design a flexible data source orchestration system that allows pluggable data sources, AI-powered query planning, and unified multi-source data collection.

**Core Principle:** **Natural Language → Executable Plan → Unified Results** - Users describe what they need, AI figures out how to get it.

---

## 🎯 REQUIREMENTS

### Functional Requirements:
1. ✅ Natural language query interface ("Find CTOs at YC-backed companies in SF")
2. ✅ AI query planner (converts NL to execution plan)
3. ✅ Pluggable data sources (easy to add new sources)
4. ✅ Multi-source orchestration (combine LinkedIn + Crunchbase + Google Maps)
5. ✅ Data normalization (different sources → unified schema)
6. ✅ Validation and quality checks
7. ✅ Enrichment pipeline (merge data from multiple sources)
8. ✅ Cost optimization (use free sources first)
9. ✅ Progress tracking (show what's happening in real-time)
10. ✅ Result caching (don't re-fetch same data)

### Non-Functional Requirements:
1. ✅ Fast (plan generation <2s)
2. ✅ Extensible (new sources in <1 day)
3. ✅ Reliable (graceful degradation if source fails)
4. ✅ Observable (track every source query)

---

## 💾 DATABASE SCHEMA ADDITIONS

### 1. Data Source Registry

```prisma
model DataSource {
  id          String   @id @default(uuid())
  
  // Source details
  name        String   // 'linkedin', 'crunchbase', 'google_maps'
  slug        String   @unique
  provider    String   // 'internal', 'api', 'scraper'
  type        SourceType
  
  // Capabilities
  capabilities String[] // ['search_people', 'enrich_company', 'find_location']
  
  // Cost & limits
  costPerQuery Float   @default(0)     // USD
  freeQueries  Int?                    // Free tier limit
  rateLimit    Int?                    // Requests per minute
  
  // Configuration
  requiresAuth Boolean  @default(false)
  configSchema Json?                   // JSON schema for config
  
  // Metadata
  enabled      Boolean  @default(true)
  priority     Int      @default(50)   // Higher = preferred
  quality      Float    @default(0.7)  // Data quality score (0-1)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  queries      DataQuery[]
  
  @@map("data_sources")
}

enum SourceType {
  SOCIAL_PLATFORM      // LinkedIn, Twitter, etc.
  BUSINESS_DATABASE    // Crunchbase, PitchBook
  MAP_SERVICE          // Google Maps, OpenStreetMap
  EMAIL_FINDER         // Hunter.io, Linkout
  WEB_SCRAPER          // Custom scrapers
  AI_SERVICE           // GPT, Claude
  INTERNAL             // Our own database
}
```

### 2. Data Query Execution

```prisma
model DataQuery {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  
  // Query details
  naturalLanguage String  @db.Text  // Original query
  parsedQuery     Json               // Structured query
  
  // Execution plan
  sourceId    String
  operation   String               // 'search', 'enrich', 'discover'
  parameters  Json                 // Source-specific params
  
  // Results
  status      QueryStatus
  resultCount Int      @default(0)
  results     Json?    @db.Text    // Actual data
  
  // Performance
  startedAt   DateTime @default(now())
  completedAt DateTime?
  latencyMs   Int?
  
  // Cost
  cost        Float    @default(0)
  
  // Error handling
  errorMessage String?
  retryCount   Int     @default(0)
  
  // Relations
  tenant      Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  source      DataSource @relation(fields: [sourceId], references: [id])
  workflow    DataWorkflow? @relation(fields: [workflowId], references: [id])
  workflowId  String?
  
  @@index([tenantId, createdAt])
  @@index([userId, createdAt])
  @@index([workflowId])
  @@map("data_queries")
}

enum QueryStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 3. Data Workflow (Multi-Step Orchestration)

```prisma
model DataWorkflow {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  
  // Workflow details
  name        String
  description String?
  naturalLanguage String @db.Text  // Original user request
  
  // Execution plan (AI-generated)
  plan        Json     @db.Text    // Step-by-step plan
  steps       DataWorkflowStep[]
  
  // Status
  status      QueryStatus
  currentStep Int      @default(0)
  
  // Results
  finalResults Json?   @db.Text
  recordCount  Int     @default(0)
  
  // Performance
  startedAt   DateTime @default(now())
  completedAt DateTime?
  totalLatencyMs Int?
  
  // Cost
  totalCost   Float    @default(0)
  
  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  queries     DataQuery[]
  
  @@index([tenantId, createdAt])
  @@index([userId, status])
  @@map("data_workflows")
}

model DataWorkflowStep {
  id          String   @id @default(uuid())
  workflowId  String
  
  // Step details
  stepNumber  Int
  name        String
  description String
  
  // Execution
  sourceSlug  String
  operation   String
  parameters  Json
  
  // Dependencies
  dependsOn   Int[]    // Which steps must complete first
  
  // Status
  status      QueryStatus @default(PENDING)
  startedAt   DateTime?
  completedAt DateTime?
  
  // Results
  resultCount Int      @default(0)
  results     Json?
  error       String?
  
  workflow    DataWorkflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  @@unique([workflowId, stepNumber])
  @@map("data_workflow_steps")
}
```

### 4. Normalized Data Cache

```prisma
model DataCache {
  id          String   @id @default(uuid())
  
  // Cache key
  cacheKey    String   @unique        // Hash of source + operation + params
  
  // Source info
  sourceSlug  String
  operation   String
  parameters  Json
  
  // Cached data
  data        Json     @db.Text
  recordCount Int
  
  // Metadata
  quality     Float    @default(0.8) // Data quality score
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  lastUsedAt  DateTime @default(now())
  hitCount    Int      @default(1)
  
  @@index([cacheKey, expiresAt])
  @@index([sourceSlug, expiresAt])
  @@map("data_cache")
}
```

---

## 🧩 DATA SOURCE ABSTRACTION (Interface)

### Base DataSource Interface

```typescript
/**
 * Abstract base class for all data sources
 * Implement this to add a new source
 */
export abstract class BaseDataSource {
  abstract readonly slug: string;
  abstract readonly name: string;
  abstract readonly type: SourceType;
  abstract readonly capabilities: string[];
  
  /**
   * Discover: Find new records matching criteria
   */
  async discover?(params: {
    query: string;
    filters?: Record<string, any>;
    limit?: number;
  }): Promise<DataSourceResult> {
    throw new Error('discover() not implemented');
  }
  
  /**
   * Collect: Fetch specific records by ID
   */
  async collect?(params: {
    ids: string[];
    fields?: string[];
  }): Promise<DataSourceResult> {
    throw new Error('collect() not implemented');
  }
  
  /**
   * Extract: Pull structured data from URL/content
   */
  async extract?(params: {
    url?: string;
    content?: string;
    schema: Record<string, any>;
  }): Promise<DataSourceResult> {
    throw new Error('extract() not implemented');
  }
  
  /**
   * Normalize: Convert source data to unified schema
   */
  async normalize(data: any[]): Promise<UnifiedRecord[]> {
    // Default: pass through
    return data as UnifiedRecord[];
  }
  
  /**
   * Validate: Check data quality
   */
  async validate(record: UnifiedRecord): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }
  
  /**
   * Enrich: Add additional fields to record
   */
  async enrich?(record: UnifiedRecord): Promise<Partial<UnifiedRecord>> {
    return {};
  }
  
  /**
   * Estimate cost for operation
   */
  estimateCost(operation: string, params: any): number {
    return 0; // Free by default
  }
  
  /**
   * Check rate limits
   */
  async checkRateLimit(): Promise<{ allowed: boolean; resetAt?: Date }> {
    return { allowed: true };
  }
}

/**
 * Unified data record schema
 */
export interface UnifiedRecord {
  // Core fields
  id: string;
  type: 'person' | 'company' | 'location' | 'post' | 'event';
  source: string;
  sourceId?: string;
  
  // Person fields
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  title?: string;
  
  // Company fields
  companyName?: string;
  companyDomain?: string;
  companySize?: string;
  industry?: string;
  
  // Location fields
  city?: string;
  state?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  
  // Social profiles
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  
  // Metadata
  confidence: number;  // 0-1
  lastUpdated: Date;
  raw: any;           // Original source data
}

export interface DataSourceResult {
  records: UnifiedRecord[];
  totalCount: number;
  nextPage?: string;
  cost: number;
  latencyMs: number;
}
```

---

## 🔧 BACKEND IMPLEMENTATION

### Module Structure

```
apps/api/src/data-orchestration/
├── orchestration.module.ts
├── services/
│   ├── query-planner.service.ts       # AI-powered planning
│   ├── orchestrator.service.ts        # Execute workflows
│   ├── source-registry.service.ts     # Manage sources
│   ├── normalizer.service.ts          # Unify data
│   ├── validator.service.ts           # Check quality
│   ├── enricher.service.ts            # Add fields
│   └── cache.service.ts               # Cache results
├── sources/
│   ├── base-source.ts                 # Abstract base
│   ├── linkedin.source.ts             # LinkedIn
│   ├── google-maps.source.ts          # Google Maps
│   ├── crunchbase.source.ts           # Crunchbase
│   ├── internal-db.source.ts          # Our database
│   └── linkout.source.ts              # Email finder
├── dto/
│   ├── query-request.dto.ts
│   └── workflow-result.dto.ts
└── controllers/
    └── orchestration.controller.ts
```

### Key Services

#### 1. QueryPlannerService (AI-Powered)

```typescript
@Injectable()
export class QueryPlannerService {
  constructor(
    private readonly aiOrchestration: AIOrchestrationService,
    private readonly sourceRegistry: SourceRegistryService,
  ) {}
  
  /**
   * Convert natural language to execution plan
   */
  async planQuery(params: {
    tenantId: string;
    userId: string;
    query: string;
  }): Promise<DataWorkflowPlan> {
    // Get available sources
    const sources = await this.sourceRegistry.getAvailableSources(params.tenantId);
    
    // Create prompt for AI planner
    const prompt = this.buildPlanningPrompt(params.query, sources);
    
    // Use AI to generate plan
    const response = await this.aiOrchestration.execute({
      tenantId: params.tenantId,
      userId: params.userId,
      taskName: 'plan_data_query',
      prompt,
      minQuality: 0.85, // High quality required for planning
    });
    
    // Parse plan
    const plan = this.parsePlan(response.response);
    
    // Validate plan
    await this.validatePlan(plan, sources);
    
    return plan;
  }
  
  /**
   * Build prompt for AI planner
   */
  private buildPlanningPrompt(query: string, sources: DataSource[]): string {
    const sourceList = sources.map(s => 
      `- ${s.name} (${s.slug}): ${s.capabilities.join(', ')} | Cost: $${s.costPerQuery} | Quality: ${s.quality}`
    ).join('\n');
    
    return `You are a data orchestration planner. Convert the user's natural language query into a step-by-step execution plan.

Available Data Sources:
${sourceList}

User Query: "${query}"

Generate a JSON plan with these steps:
1. Parse the query to identify: target (people/companies/locations), criteria (filters), required fields
2. Select the best data sources (prefer free sources, high quality)
3. Create step-by-step plan with dependencies
4. Estimate total cost and time

Return ONLY valid JSON in this format:
{
  "target": "people" | "companies" | "locations",
  "criteria": {
    "title": "CTO",
    "location": "San Francisco",
    "industry": "Technology"
  },
  "steps": [
    {
      "stepNumber": 1,
      "name": "Search LinkedIn",
      "description": "Find CTOs in SF tech companies",
      "sourceSlug": "linkedin",
      "operation": "discover",
      "parameters": {
        "query": "CTO",
        "filters": { "location": "San Francisco", "industry": "Technology" }
      },
      "dependsOn": [],
      "estimatedResults": 100,
      "estimatedCost": 0
    },
    {
      "stepNumber": 2,
      "name": "Enrich with emails",
      "description": "Find email addresses",
      "sourceSlug": "linkout",
      "operation": "enrich",
      "parameters": { "fields": ["email"] },
      "dependsOn": [1],
      "estimatedResults": 80,
      "estimatedCost": 0
    }
  ],
  "estimatedTotalResults": 80,
  "estimatedTotalCost": 0,
  "estimatedDuration": "2-3 minutes"
}`;
  }
  
  /**
   * Parse AI response into plan
   */
  private parsePlan(response: string): DataWorkflowPlan {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const json = jsonMatch ? jsonMatch[1] : response;
    
    try {
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Failed to parse plan from AI response');
    }
  }
  
  /**
   * Validate plan is executable
   */
  private async validatePlan(
    plan: DataWorkflowPlan,
    sources: DataSource[],
  ): Promise<void> {
    for (const step of plan.steps) {
      // Check source exists
      const source = sources.find(s => s.slug === step.sourceSlug);
      if (!source) {
        throw new Error(`Unknown source: ${step.sourceSlug}`);
      }
      
      // Check source has capability
      if (!source.capabilities.includes(step.operation)) {
        throw new Error(`Source ${step.sourceSlug} doesn't support ${step.operation}`);
      }
      
      // Check dependencies are valid
      for (const dep of step.dependsOn) {
        if (dep >= step.stepNumber) {
          throw new Error(`Invalid dependency: step ${step.stepNumber} depends on future step ${dep}`);
        }
      }
    }
  }
}
```

#### 2. OrchestratorService (Execute Workflows)

```typescript
@Injectable()
export class OrchestratorService {
  constructor(
    private readonly sourceRegistry: SourceRegistryService,
    private readonly normalizer: NormalizerService,
    private readonly validator: ValidatorService,
    private readonly enricher: EnricherService,
    private readonly cache: CacheService,
  ) {}
  
  /**
   * Execute data workflow
   */
  async executeWorkflow(
    tenantId: string,
    userId: string,
    plan: DataWorkflowPlan,
  ): Promise<DataWorkflowResult> {
    // Create workflow record
    const workflow = await this.prisma.dataWorkflow.create({
      data: {
        tenantId,
        userId,
        name: plan.steps[0]?.name || 'Data Collection',
        naturalLanguage: plan.originalQuery,
        plan: plan as any,
        status: QueryStatus.RUNNING,
      },
    });
    
    const results: UnifiedRecord[] = [];
    const stepResults = new Map<number, UnifiedRecord[]>();
    
    try {
      // Execute steps in order (respecting dependencies)
      for (const step of plan.steps) {
        // Wait for dependencies
        await this.waitForDependencies(step, stepResults);
        
        // Get input from dependencies
        const input = this.collectDependencyInput(step, stepResults);
        
        // Execute step
        const stepResult = await this.executeStep({
          tenantId,
          userId,
          workflowId: workflow.id,
          step,
          input,
        });
        
        // Store results
        stepResults.set(step.stepNumber, stepResult.records);
        results.push(...stepResult.records);
        
        // Update progress
        await this.prisma.dataWorkflow.update({
          where: { id: workflow.id },
          data: { currentStep: step.stepNumber },
        });
      }
      
      // Normalize all results
      const normalized = await this.normalizer.normalize(results);
      
      // Validate
      const validated = await this.validator.validateBatch(normalized);
      
      // Enrich
      const enriched = await this.enricher.enrichBatch(validated);
      
      // Mark complete
      await this.prisma.dataWorkflow.update({
        where: { id: workflow.id },
        data: {
          status: QueryStatus.COMPLETED,
          finalResults: enriched as any,
          recordCount: enriched.length,
          completedAt: new Date(),
        },
      });
      
      return {
        workflowId: workflow.id,
        status: 'completed',
        records: enriched,
        totalCount: enriched.length,
      };
    } catch (error) {
      // Mark failed
      await this.prisma.dataWorkflow.update({
        where: { id: workflow.id },
        data: {
          status: QueryStatus.FAILED,
          completedAt: new Date(),
        },
      });
      
      throw error;
    }
  }
  
  /**
   * Execute single step
   */
  private async executeStep(params: {
    tenantId: string;
    userId: string;
    workflowId: string;
    step: WorkflowStep;
    input?: UnifiedRecord[];
  }): Promise<DataSourceResult> {
    const { step, input } = params;
    
    // Check cache
    const cached = await this.cache.get({
      sourceSlug: step.sourceSlug,
      operation: step.operation,
      parameters: step.parameters,
    });
    
    if (cached) {
      return cached;
    }
    
    // Get source
    const source = await this.sourceRegistry.getSource(step.sourceSlug);
    
    // Check rate limit
    const rateLimit = await source.checkRateLimit();
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded for ${step.sourceSlug}`);
    }
    
    // Execute operation
    let result: DataSourceResult;
    
    switch (step.operation) {
      case 'discover':
        result = await source.discover(step.parameters);
        break;
      
      case 'collect':
        result = await source.collect(step.parameters);
        break;
      
      case 'extract':
        result = await source.extract(step.parameters);
        break;
      
      case 'enrich':
        // Enrich input records
        const enriched = await Promise.all(
          (input || []).map(record => source.enrich(record))
        );
        result = {
          records: input.map((record, i) => ({ ...record, ...enriched[i] })),
          totalCount: input.length,
          cost: source.estimateCost('enrich', { count: input.length }),
          latencyMs: 0,
        };
        break;
      
      default:
        throw new Error(`Unknown operation: ${step.operation}`);
    }
    
    // Cache result
    await this.cache.set({
      sourceSlug: step.sourceSlug,
      operation: step.operation,
      parameters: step.parameters,
      result,
      ttl: 3600, // 1 hour
    });
    
    // Track query
    await this.prisma.dataQuery.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        workflowId: params.workflowId,
        naturalLanguage: `${step.name}: ${step.description}`,
        parsedQuery: step.parameters as any,
        sourceId: source.id,
        operation: step.operation,
        parameters: step.parameters as any,
        status: QueryStatus.COMPLETED,
        resultCount: result.totalCount,
        results: result.records as any,
        completedAt: new Date(),
        latencyMs: result.latencyMs,
        cost: result.cost,
      },
    });
    
    return result;
  }
}
```

---

## 📦 EXAMPLE DATA SOURCES

### 1. LinkedIn Source

```typescript
@Injectable()
export class LinkedInSource extends BaseDataSource {
  readonly slug = 'linkedin';
  readonly name = 'LinkedIn';
  readonly type = SourceType.SOCIAL_PLATFORM;
  readonly capabilities = ['discover', 'collect', 'enrich'];
  
  constructor(
    private readonly linkedinAdapter: LinkedinAdapter,
  ) {
    super();
  }
  
  async discover(params: {
    query: string;
    filters?: { location?: string; title?: string; company?: string };
    limit?: number;
  }): Promise<DataSourceResult> {
    const startTime = Date.now();
    
    // Use existing LinkedIn adapter
    const results = await this.linkedinAdapter.searchPeople({
      keywords: params.query,
      location: params.filters?.location,
      title: params.filters?.title,
      company: params.filters?.company,
      limit: params.limit || 25,
    });
    
    // Normalize to unified schema
    const records = results.map(r => this.toUnified(r));
    
    return {
      records,
      totalCount: records.length,
      cost: 0, // Free (scraping)
      latencyMs: Date.now() - startTime,
    };
  }
  
  async collect(params: {
    ids: string[];
  }): Promise<DataSourceResult> {
    const startTime = Date.now();
    
    const results = await Promise.all(
      params.ids.map(id => this.linkedinAdapter.getProfile(id))
    );
    
    const records = results.map(r => this.toUnified(r));
    
    return {
      records,
      totalCount: records.length,
      cost: 0,
      latencyMs: Date.now() - startTime,
    };
  }
  
  private toUnified(data: any): UnifiedRecord {
    return {
      id: `linkedin:${data.publicIdentifier}`,
      type: 'person',
      source: 'linkedin',
      sourceId: data.publicIdentifier,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
      title: data.headline,
      companyName: data.companyName,
      city: data.geoLocationName,
      linkedin: `https://linkedin.com/in/${data.publicIdentifier}`,
      confidence: 0.9,
      lastUpdated: new Date(),
      raw: data,
    };
  }
}
```

### 2. Google Maps Source

```typescript
@Injectable()
export class GoogleMapsSource extends BaseDataSource {
  readonly slug = 'google_maps';
  readonly name = 'Google Maps';
  readonly type = SourceType.MAP_SERVICE;
  readonly capabilities = ['discover', 'collect'];
  
  constructor(
    @Inject('GOOGLE_MAPS_CLIENT') private readonly client: any,
  ) {
    super();
  }
  
  async discover(params: {
    query: string;
    filters?: { location?: string; type?: string };
    limit?: number;
  }): Promise<DataSourceResult> {
    const startTime = Date.now();
    
    // Google Places API search
    const response = await this.client.placesNearby({
      location: params.filters?.location || 'San Francisco, CA',
      query: params.query,
      type: params.filters?.type || 'establishment',
      rankby: 'prominence',
    });
    
    const records = response.data.results
      .slice(0, params.limit || 25)
      .map(r => this.toUnified(r));
    
    return {
      records,
      totalCount: records.length,
      cost: 0.017, // $17 per 1000 requests
      latencyMs: Date.now() - startTime,
    };
  }
  
  private toUnified(data: any): UnifiedRecord {
    return {
      id: `gmaps:${data.place_id}`,
      type: 'location',
      source: 'google_maps',
      sourceId: data.place_id,
      companyName: data.name,
      city: data.vicinity,
      coordinates: {
        lat: data.geometry.location.lat,
        lng: data.geometry.location.lng,
      },
      confidence: 0.95,
      lastUpdated: new Date(),
      raw: data,
    };
  }
}
```

### 3. Linkout Email Source

```typescript
@Injectable()
export class LinkoutSource extends BaseDataSource {
  readonly slug = 'linkout';
  readonly name = 'Linkout Email Finder';
  readonly type = SourceType.EMAIL_FINDER;
  readonly capabilities = ['enrich'];
  
  async enrich(record: UnifiedRecord): Promise<Partial<UnifiedRecord>> {
    if (record.type !== 'person') {
      return {};
    }
    
    if (!record.firstName || !record.lastName || !record.companyDomain) {
      return {};
    }
    
    // Use FREE email finder
    const result = await findEmailFree({
      firstName: record.firstName,
      lastName: record.lastName,
      company: record.companyName || '',
      domain: record.companyDomain,
    });
    
    if (result.email) {
      return {
        email: result.email,
        confidence: Math.min(record.confidence, result.confidence / 100),
      };
    }
    
    return {};
  }
  
  estimateCost(): number {
    return 0; // 100% FREE!
  }
}
```

---

## 🎨 API USAGE EXAMPLES

### Example 1: Natural Language Query

```typescript
// User: "Find CTOs at YC-backed companies in San Francisco"

POST /api/data/query
{
  "query": "Find CTOs at YC-backed companies in San Francisco"
}

// Response:
{
  "workflowId": "wf_abc123",
  "status": "running",
  "plan": {
    "steps": [
      {
        "stepNumber": 1,
        "name": "Search Crunchbase",
        "description": "Find YC-backed companies in SF",
        "sourceSlug": "crunchbase",
        "operation": "discover",
        "parameters": {
          "query": "YC",
          "filters": { "location": "San Francisco" }
        }
      },
      {
        "stepNumber": 2,
        "name": "Search LinkedIn",
        "description": "Find CTOs at these companies",
        "sourceSlug": "linkedin",
        "operation": "discover",
        "parameters": {
          "title": "CTO",
          "companies": "<from step 1>"
        },
        "dependsOn": [1]
      },
      {
        "stepNumber": 3,
        "name": "Find Emails",
        "description": "Get contact information",
        "sourceSlug": "linkout",
        "operation": "enrich",
        "dependsOn": [2]
      }
    ]
  },
  "estimatedResults": 50,
  "estimatedCost": 0,
  "estimatedDuration": "3-5 minutes"
}

// Poll for results:
GET /api/data/workflow/wf_abc123

// Final response:
{
  "workflowId": "wf_abc123",
  "status": "completed",
  "records": [
    {
      "id": "unified:person:123",
      "type": "person",
      "fullName": "Jane Smith",
      "title": "CTO",
      "companyName": "Acme Corp",
      "email": "jane.smith@acme.com",
      "linkedin": "https://linkedin.com/in/janesmith",
      "confidence": 0.92,
      "sources": ["linkedin", "linkout"]
    }
  ],
  "totalCount": 47,
  "totalCost": 0,
  "duration": "4m 32s"
}
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Week 1: Core Infrastructure
- [ ] Add database models
- [ ] Create BaseDataSource abstract class
- [ ] Implement SourceRegistryService
- [ ] Implement NormalizerService
- [ ] Implement CacheService

### Week 2: AI Planning
- [ ] Implement QueryPlannerService
- [ ] Implement OrchestratorService
- [ ] Add workflow execution engine
- [ ] Implement ValidatorService
- [ ] Add progress tracking

### Week 3: Data Sources
- [ ] Implement LinkedInSource
- [ ] Implement GoogleMapsSource
- [ ] Implement LinkoutSource
- [ ] Implement InternalDBSource
- [ ] Add CrunchbaseSource

### Week 4: API & Testing
- [ ] Create REST API endpoints
- [ ] Build admin UI for workflows
- [ ] Add real-time progress updates (WebSocket)
- [ ] Write integration tests
- [ ] Documentation

---

## 🎯 SUCCESS CRITERIA

✅ **Functional:**
- Natural language queries work
- Multi-source workflows execute correctly
- Data is normalized across sources
- Enrichment adds value
- Caching reduces redundant queries

✅ **Performance:**
- Plan generation <2s
- Workflow execution scales to 1000+ records
- Cache hit rate >40%

✅ **Quality:**
- Data validation catches errors
- Confidence scores are accurate
- Sources fail gracefully

✅ **Extensibility:**
- New source added in <1 day
- Custom operations easy to add

---

**Status:** ✅ DESIGN COMPLETE  
**Next Step:** Begin implementation (Week 1)  
**Estimated Completion:** 4 weeks  
**Date:** 2026-08-15
