# USAMKO Platform - Master Specification (Part 1: Architecture & Design)

**Version:** 2.0.0  
**Document Status:** Single Source of Truth  
**Last Updated:** 2026-07-26  
**Replaces:** All previous architectural documents and uploaded specifications

---

## Document Overview

This is **Part 1 of 2** of the USAMKO Platform Master Specification, serving as the definitive single source of truth for the platform's transformation from a legacy desktop automation tool to an enterprise-grade Automation Operating System.

**Part 1** covers: Architecture, Design Principles, Technology Stack, and Core Patterns  
**Part 2** covers: 19 Domain Specifications, 700+ Modules, Platform Adapters, and Implementation Details

This document consolidates 24+ architectural blueprints, system schemas, and level breakdowns, resolving all conflicts and duplications identified during deep analysis.

---

## Executive Summary

### Vision Statement

USAMKO Platform transforms from "Sender Pro" (a Windows desktop automation tool) into a comprehensive **Enterprise Automation Operating System** that provides:

- **35+ Platform Adapters** (Facebook, Instagram, LinkedIn, WhatsApp, Telegram, TikTok, X/Twitter, YouTube, Google Workspace, Email, etc.)
- **19 Core Domains** with 700+ modules and 4,000+ microservices
- **AI-Native Architecture** with autonomous agents, visual understanding, and multi-provider support (OpenAI, Claude, Gemini, Ollama)
- **Knowledge Graph Intelligence** with entity resolution across platforms
- **Visual Workflow Builder** with code-free automation
- **Enterprise Features** at scale (10,000+ accounts, multi-tenant, SOC 2 compliance)

### Current State (v1.0 - Legacy)

**Technology:**
- .NET 8, C#, ASP.NET Core, Entity Framework Core
- PostgreSQL/SQLite databases
- Playwright browser automation
- 10 projects in solution (8 source + 2 test)
- JWT authentication, Serilog logging
- Basic plugin SDK (IPlugin, PluginManifest)

**Capabilities:**
- 13 platform integrations (basic level)
- 8 AI operations via AI.Bridge microservice (port 5100)
- JSON-based workflow engine
- Chrome Extension (Manifest V3) for Facebook/Twitter/Instagram API interception
- 5 subscription tiers (Free, Basic, Pro, Business, Enterprise)

**Status:** 
The current codebase is primarily **stubs and skeletons**. The transformation plan marks phases as "complete" but actual implementations are minimal. This v1.0 is considered **legacy code** that will be **replaced** (not extended) by v2.0.

### Target State (v2.0 - Enterprise)

**Scale Targets:**
- 10,000+ concurrent managed accounts
- 35+ platform adapters with full feature parity
- 700+ autonomous modules
- 4,000+ microservices
- 1,500+ AI tools and capabilities
- Multi-region deployment (NA, EU, APAC)
- 99.9% uptime SLA

**Key Differentiators:**
1. **Platform OS Architecture** - 21 specialized "Operating Systems" (Browser OS, AI OS, CRM OS, Marketing OS, etc.)
2. **Autonomous AI Agents** - Self-healing selectors, vision-based navigation, human simulation
3. **Universal Entity Resolution** - Cross-platform identity matching (same person across all platforms = 1 unified entity)
4. **Knowledge Graph** - Neo4j + Qdrant + OpenSearch for relationship intelligence
5. **Feature Catalog Pattern** - Universal capabilities inherited by all platform adapters
6. **MCP Integration** - Both server (expose tools) and client (consume external MCP servers)

---

## Architecture Overview

### Philosophy: Modular Monolith First

**Decision:** Start with a **Modular Monolith**, split to microservices only when needed.

**Rationale:**
- Faster initial development
- Easier debugging and testing
- Lower operational complexity
- Natural boundaries for future service extraction
- Shared transaction context when needed

**When to Extract Services:**
- Independent scaling requirements (e.g., browser automation needs 10x more compute)
- Different deployment cycles (AI models update weekly, core platform monthly)
- Clear bounded context with minimal dependencies
- Team ownership boundaries

### 5-Layer Execution Model

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: UI Layer (Presentation)                            │
│ - Desktop App (Electron/Tauri)                              │
│ - Web App (Next.js + React)                                 │
│ - Mobile App (React Native / Flutter - future)              │
│ - CLI (Node.js Commander)                                   │
│ - Chrome Extension (Manifest V3)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓ REST/GraphQL/WebSocket
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Workflow Layer (Orchestration)                     │
│ - Visual Workflow Builder (drag-and-drop)                   │
│ - Workflow Engine (Temporal for durable workflows)          │
│ - Scheduler (APScheduler + Celery for cron triggers)        │
│ - Event Bus (Redis Pub/Sub for real-time UI sync)           │
└─────────────────────────────────────────────────────────────┘
                            ↓ Service Bus
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Automation SDK (High-Level APIs)                   │
│ - Platform Adapters (Facebook, Instagram, LinkedIn, etc.)   │
│ - AI Tools (content generation, sentiment, translations)    │
│ - CRM Operations (lead capture, enrichment, scoring)        │
│ - Marketing Tools (campaigns, A/B testing, analytics)       │
│ - Feature Catalog (universal capabilities)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓ Platform SDK
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Platform SDK (Core Services)                       │
│ - Browser Platform (Playwright, profiles, proxies)          │
│ - AI Platform (LangGraph, MCP, multi-provider)              │
│ - Data Platform (PostgreSQL, ClickHouse, Redis, Neo4j)      │
│ - Identity Platform (Auth, RBAC, multi-tenant)              │
│ - Storage Platform (MinIO, CDN)                             │
│ - Communication Platform (Email, SMS, Push)                 │
│ - Enterprise Service Bus (RabbitMQ for service-to-service)  │
└─────────────────────────────────────────────────────────────┘
                            ↓ Direct I/O
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Browser/API Layer (External Interactions)          │
│ - Real Browsers (Chromium, Firefox, WebKit)                 │
│ - Platform APIs (Facebook Graph API, LinkedIn API, etc.)    │
│ - Third-Party Services (Twilio, SendGrid, Stripe)           │
│ - External MCP Servers                                      │
└─────────────────────────────────────────────────────────────┘
```

### Platform OS Meta-Layer

The platform provides 21 specialized "Operating Systems" that sit above the 5-layer model:

1. **Browser OS** - Manages browser instances, profiles, sessions, fingerprints
2. **AI OS** - Orchestrates LLM providers, agents, tools, prompts, vector stores
3. **CRM OS** - Unified contact/lead/deal management across all platforms
4. **Marketing OS** - Campaign management, A/B testing, content scheduling
5. **Social OS** - Cross-platform social media operations and analytics
6. **Communication OS** - Email, SMS, push notifications, in-app messaging
7. **Automation OS** - Workflow execution, task scheduling, triggers
8. **Data OS** - ETL, data warehousing, analytics, reporting
9. **Identity OS** - Authentication, authorization, SSO, multi-tenant isolation
10. **Storage OS** - File management, media processing, CDN
11. **Analytics OS** - Real-time metrics, dashboards, business intelligence
12. **Monitoring OS** - Logging, tracing, alerting, health checks
13. **Developer OS** - SDK, APIs, webhooks, plugin marketplace
14. **Knowledge OS** - Knowledge graph, entity resolution, semantic search
15. **Search OS** - Full-text search, fuzzy matching, autocomplete
16. **Notification OS** - Event-driven notifications, push, email, Slack
17. **Workflow OS** - Visual builder, version control, templates
18. **Integration OS** - Third-party connectors, Zapier-style integrations
19. **Compliance OS** - Audit logs, data retention, GDPR/CCPA compliance
20. **Enterprise OS** - Multi-tenant, SSO, RBAC, white-label
21. **Deployment OS** - CI/CD, infrastructure as code, multi-region

Each "OS" is a logical grouping of related services and capabilities that can be consumed independently.

---

## Technology Stack (v2.0 - Final Decision)

### Core Backend

**Framework:** NestJS (Node.js)
- **Why:** Modular architecture out of the box, TypeScript first-class, excellent DI container
- **Pattern:** Modular Monolith with clear module boundaries
- **API Styles:** REST, GraphQL (optional), WebSocket (real-time)
- **Validation:** Zod or Joi for runtime type safety
- **ORM:** Prisma (type-safe, migrations, multi-DB support)

### Frontend

**Web App:** Next.js 14+ (App Router) + React 18+
- **Why:** Server components, streaming SSR, built-in routing, edge runtime support
- **State Management:** Zustand (lightweight) or Redux Toolkit (complex apps)
- **UI Components:** shadcn/ui (Radix + Tailwind) for accessibility
- **Forms:** React Hook Form + Zod
- **Data Fetching:** TanStack Query (React Query) for caching/optimistic updates

**Desktop App:** Electron or Tauri
- **Electron:** Mature ecosystem, better Chrome extension compatibility
- **Tauri:** Smaller bundle size, Rust backend, better security
- **Decision:** Electron for v2.0 (Chrome extension reuse), Tauri migration in v2.5

**Mobile App:** React Native (future phase)

### Browser Automation

**Engine:** Playwright (Chromium, Firefox, WebKit)
- **Why:** Modern API, multi-browser, built-in wait strategies, mobile emulation
- **Alternatives Considered:** Puppeteer (Chrome-only), Selenium (legacy)

**Browser Cloud:** Browserless (Docker-based browser pool)
- **Features:** Pre-warmed instances, automatic cleanup, resource limits
- **Deployment:** Kubernetes StatefulSet for persistent browser profiles

**Fingerprinting:** Custom fingerprint engine (Canvas, WebGL, Audio, Fonts, TLS)
- **Anti-Detection:** Camoufox (hardened Firefox) for stealth profiles
- **Human Simulation:** Bezier curves for mouse, realistic typing speed, reading time

### AI Platform

**Orchestration:** LangGraph (state machines for agentic workflows)
- **Why:** Explicit state management, error recovery, human-in-the-loop support

**MCP Integration:**
- **MCP Server:** Expose platform tools to Claude Desktop, Cline, etc.
- **MCP Client:** Connect to external MCP servers (database tools, search, etc.)

**LLM Providers:**
- **OpenAI:** GPT-4.5, GPT-4o (vision), DALL-E 3 (image generation)
- **Anthropic:** Claude 5 Opus/Sonnet/Haiku (long context, function calling)
- **Google:** Gemini 2.5 Pro (multimodal, 2M token context)
- **Local:** Ollama (Llama 3.3, Mistral, Qwen - privacy-sensitive workloads)

**Vector Store:** Qdrant (vector similarity search for RAG)
- **Alternatives:** Pinecone (cloud), Milvus (scale), pgvector (simple)

**Embeddings:** OpenAI text-embedding-3-large or Cohere embed-v3
- **Why:** 3072 dimensions, multilingual, SOTA retrieval

### Data Platform

**Primary Database:** PostgreSQL 16+
- **Why:** JSONB for flexible schemas, full-text search, pgvector for embeddings
- **Schema:** Multi-tenant with row-level security (RLS)
- **Extensions:** pg_trgm (fuzzy search), uuid-ossp, pg_stat_statements

**Time-Series Analytics:** ClickHouse
- **Use Cases:** Event logs, user actions, campaign metrics, real-time dashboards
- **Why:** 100x faster than PostgreSQL for analytical queries, columnar storage

**Caching:** Redis 7+ (Redis Stack for JSON, search, time-series)
- **Use Cases:** Session store, rate limiting, real-time leaderboards, pub/sub

**Graph Database:** Neo4j
- **Use Cases:** Knowledge graph, entity relationships, social network analysis
- **Schema:** Entities (Person, Company, Content) + Relationships (WORKS_AT, POSTED, INTERACTED_WITH)

**Search Engine:** Elasticsearch 8+
- **Use Cases:** Full-text search across all content, fuzzy matching, autocomplete
- **Alternatives:** OpenSearch (AWS fork), Meilisearch (lightweight for app-level search)

**Object Storage:** MinIO (S3-compatible)
- **Use Cases:** Media files, exports, backups
- **Deployment:** Multi-node distributed mode for HA

### Message Queue & Event Bus

**Service-to-Service (ESB):** RabbitMQ
- **Why:** Reliable delivery, dead-letter queues, topic-based routing
- **Patterns:** Work queues (load balancing), pub/sub (events), RPC (request-reply)
- **Use Cases:** Background jobs, cross-service events, async processing

**Stream Processing:** Apache Kafka (optional - high-throughput scenarios)
- **Use Cases:** Event sourcing, audit logs, CDC (change data capture)
- **When:** >100k events/sec, need replay/reprocessing

**Real-Time UI Sync:** Redis Pub/Sub
- **Use Cases:** Workflow status updates, notification badges, live dashboards
- **Why:** Low latency (<10ms), simple API, already in stack

### Workflow Orchestration

**Durable Workflows:** Temporal
- **Use Cases:** Long-running workflows (hours/days), retries with exponential backoff, versioning
- **Why:** Guarantees (at-most-once/at-least-once), built-in visibility UI
- **Languages:** TypeScript SDK

**Cron Scheduling:** APScheduler + Celery
- **Use Cases:** Hourly reports, daily cleanups, periodic syncs
- **Why:** Simpler than Temporal for basic cron, Redis-backed state

### Monitoring & Observability

**Logs:** Serilog (structured JSON) → Loki or Elasticsearch
- **Retention:** 30 days hot, 90 days warm, 1 year cold (S3)

**Metrics:** Prometheus + Grafana
- **Custom Dashboards:** API latency, workflow success rate, browser pool utilization

**Tracing:** OpenTelemetry → Jaeger or Tempo
- **Use Cases:** Distributed tracing across services, performance bottlenecks

**Alerting:** Grafana Alertmanager → PagerDuty/Slack
- **Rules:** High error rate, slow workflows, database connection pool exhaustion

**Error Tracking:** Sentry (frontend + backend)

### Security

**Secrets Management:**
- **Local Desktop:** DPAPI (Windows Data Protection API) for encrypted storage
- **Cloud/Enterprise:** Infisical (open-source, Doppler alternative) or HashiCorp Vault
- **Why Infisical:** Self-hostable, audit logs, RBAC, versioning, cheaper than Vault

**Authentication:**
- **Protocol:** OAuth 2.0 + OpenID Connect
- **Provider:** Auth0 (cloud) or Keycloak (self-hosted)
- **Tokens:** JWT with short expiry (15min access, 7-day refresh)
- **MFA:** TOTP (Google Authenticator), SMS backup, WebAuthn (passkeys - future)

**Authorization:**
- **Model:** RBAC (Role-Based Access Control) + ABAC (Attribute-Based for enterprise)
- **Enforcement:** NestJS Guards, middleware checks, database RLS

**API Security:**
- **Rate Limiting:** Redis-based sliding window (per-user, per-IP)
- **CORS:** Strict origin whitelist
- **Helmet.js:** Security headers (CSP, HSTS, X-Frame-Options)
- **Input Validation:** Zod schemas on all endpoints

### DevOps & Infrastructure

**Containerization:** Docker + Docker Compose (local dev), Kubernetes (production)

**CI/CD:** GitHub Actions
- **Pipelines:** Lint → Test → Build → Deploy
- **Environments:** Dev (auto-deploy on main), Staging (manual approval), Prod (canary rollout)

**Infrastructure as Code:** Terraform or Pulumi
- **Providers:** AWS, GCP, Azure, DigitalOcean
- **Modules:** VPC, RDS, EKS, S3, CloudFront

**Cloud Provider:** Multi-cloud ready, default AWS
- **Compute:** EKS (Kubernetes), EC2 (VMs), Lambda (serverless functions)
- **Database:** RDS PostgreSQL (primary), DocumentDB (MongoDB-compatible), ElastiCache (Redis)
- **Storage:** S3 (objects), EBS (block), EFS (file)

**Regions:** us-east-1 (primary), eu-west-1, ap-southeast-1

### Development Tools

**Language:** TypeScript 5+ (strict mode)
- **Why:** Type safety, refactoring confidence, better IDE support

**Package Manager:** pnpm (faster installs, disk space efficient)

**Monorepo:** Turborepo or Nx
- **Why:** Shared packages, incremental builds, remote caching

**Testing:**
- **Unit:** Vitest (Jest-compatible, faster)
- **Integration:** Supertest (API testing)
- **E2E:** Playwright Test (browser automation)
- **Coverage:** 80%+ target

**Linting/Formatting:**
- **ESLint:** Airbnb style guide + custom rules
- **Prettier:** Auto-formatting
- **Husky:** Pre-commit hooks (lint, format, test)

**Documentation:**
- **API Docs:** OpenAPI 3.1 (Swagger UI)
- **Code Docs:** TSDoc comments (auto-generate with TypeDoc)
- **Guides:** Docusaurus (versioned docs site)

---

## Design Principles

### 1. Legitimate Use Only

**Critical Constraint:**

> "في الوثيقة الأصلية لـ Sender Pro توجد بعض الوظائف مثل إرسال رسائل جماعية غير مرغوب فيها، أو دعوات آلية مكثفة، أو التفاعل الآلي واسع النطاق. من الناحية التقنية يمكن بناء نظام إدارة مهام وجدولة وأتمتة عامة، لكن عند تنفيذ منتج فعلي أنصح بتصميمه بحيث يدعم الاستخدامات المشروعة (مثل إدارة المحتوى، الجدولة، التحليلات، وإدارة الحسابات المصرح بها) ويلتزم بسياسات المنصات لتجنب حظر الحسابات أو إساءة الاستخدام."

**Translation:**
"In the original Sender Pro document, there are features like sending bulk unsolicited messages, intensive automated invitations, or large-scale automated interactions. Technically, it's possible to build a general task management, scheduling, and automation system, but when implementing an actual product, I recommend designing it to support legitimate uses (such as content management, scheduling, analytics, and authorized account management) and comply with platform policies to avoid account bans or misuse."

**Implementation:**
- **Focus Areas:** Content management, scheduling, analytics, reporting, authorized account management
- **Prohibited:** Spam, mass unsolicited messages, bypassing rate limits, fake engagement
- **Rate Limiting:** Enforce platform-recommended limits (e.g., Facebook: 200 actions/hour)
- **User Consent:** Require explicit opt-in for all automated actions on behalf of users
- **Audit Trail:** Log all actions for compliance review
- **Terms of Service:** Clear acceptable use policy, automated violation detection

### 2. Platform Compliance First

**Principle:** Every platform adapter must respect the platform's official policies and rate limits.

**Guidelines:**
- Always use official APIs when available (e.g., Facebook Graph API, LinkedIn Marketing API)
- Browser automation only when no API exists (e.g., scraping public profiles with consent)
- Implement exponential backoff on rate limit errors
- Respect robots.txt and platform-specific crawl delays
- Never bypass CAPTCHA or authentication challenges programmatically
- Store platform credentials securely (OAuth tokens, not passwords)

### 3. Modular & Extensible

**Principle:** Every component should be replaceable without rewriting the platform.

**Patterns:**
- **Dependency Injection:** Constructor injection for all services (NestJS providers)
- **Interface-Based Design:** Depend on abstractions (interfaces), not concrete implementations
- **Plugin Architecture:** Each platform adapter as an independent plugin
- **Feature Flags:** Toggle features without code changes (LaunchDarkly or PostHog)
- **Adapter Pattern:** Unified interface for heterogeneous backends (e.g., IBrowserProvider for Playwright/Selenium/Puppeteer)

**Example:**
```typescript
// Abstract interface
interface IAIProvider {
  generateText(prompt: string, options: GenerateOptions): Promise<string>;
  generateImage(prompt: string, options: ImageOptions): Promise<Buffer>;
}

// Multiple implementations
class OpenAIProvider implements IAIProvider { /* ... */ }
class ClaudeProvider implements IAIProvider { /* ... */ }
class OllamaProvider implements IAIProvider { /* ... */ }

// Injected via DI, selected via config/feature flag
class ContentService {
  constructor(@Inject('AI_PROVIDER') private ai: IAIProvider) {}
}
```

### 4. Performance at Scale

**Targets:**
- **API Latency:** p50 < 100ms, p95 < 500ms, p99 < 1s
- **Workflow Execution:** Handle 10,000 concurrent workflows
- **Database Queries:** All queries < 50ms (indexed), < 500ms (complex joins)
- **Browser Instances:** 500+ concurrent browsers per node (Browserless pool)
- **Real-Time Updates:** WebSocket messages < 50ms latency

**Strategies:**
- **Caching:** Redis for hot data (TTL: 5min-1hr depending on volatility)
- **Database Indexing:** Composite indexes on frequent query patterns, partial indexes for filtered queries
- **Connection Pooling:** PostgreSQL (max 100 connections), Redis (max 50)
- **Lazy Loading:** Load related entities on-demand, not eagerly
- **Pagination:** Cursor-based pagination for infinite scroll, offset for fixed pages
- **Async Processing:** Background jobs for non-critical tasks (email sending, report generation)
- **Horizontal Scaling:** Stateless services behind load balancer, scale browser pods independently

### 5. Security by Design

**Threats:**
- **Credential Theft:** Store OAuth tokens encrypted (AES-256-GCM), rotate keys quarterly
- **SQL Injection:** Use parameterized queries only (Prisma prevents this by default)
- **XSS:** Sanitize user input, CSP headers, escape output
- **CSRF:** SameSite cookies, anti-CSRF tokens
- **Privilege Escalation:** Principle of least privilege, RBAC on all endpoints
- **Data Leakage:** Multi-tenant isolation via tenant_id column + RLS, separate schemas per tenant (enterprise tier)

**Compliance:**
- **GDPR:** Right to erasure, data portability, consent management
- **CCPA:** Do Not Sell disclosure, opt-out mechanism
- **SOC 2:** Audit logs (immutable), encryption at rest/in transit, annual penetration testing

### 6. Observable & Debuggable

**Principle:** Every failure should have a clear audit trail.

**Practices:**
- **Structured Logging:** JSON logs with correlation IDs (trace requests across services)
- **Distributed Tracing:** OpenTelemetry for cross-service traces
- **Health Checks:** `/health` endpoint on every service (readiness + liveness probes)
- **Circuit Breakers:** Fail fast on downstream service outages (prevent cascading failures)
- **Graceful Degradation:** Fallback to cached data if primary service unavailable
- **Error Budgets:** Allow 0.1% error rate, alert if exceeded

### 7. Developer Experience

**Principle:** Make the right thing the easy thing.

**Practices:**
- **Auto-Generated Clients:** OpenAPI → TypeScript client SDK (type-safe API calls)
- **Hot Reload:** NestJS dev mode, Next.js Fast Refresh
- **One-Command Setup:** `pnpm install && pnpm dev` starts entire stack (Docker Compose)
- **Interactive Docs:** Swagger UI with "Try It Out" for every endpoint
- **Example Workflows:** Pre-built templates for common use cases
- **Plugin Generator:** CLI to scaffold new platform adapter (`pnpm create-plugin --name=TikTok`)

---

## Core Architectural Patterns

### Feature Catalog Pattern

**Problem:** Each platform adapter (Facebook, Instagram, LinkedIn) implements similar features (post, comment, like, share) with different APIs.

**Solution:** Define a universal feature catalog that all adapters implement.

**Example:**
```typescript
// Universal feature interface
interface IPostFeature {
  createPost(content: PostContent, options: PostOptions): Promise<PostResult>;
  schedulePost(content: PostContent, scheduledAt: Date): Promise<ScheduledPost>;
  updatePost(postId: string, content: Partial<PostContent>): Promise<PostResult>;
  deletePost(postId: string): Promise<void>;
  getPostMetrics(postId: string): Promise<PostMetrics>;
}

// Each platform implements the interface
class FacebookPostFeature implements IPostFeature { /* Facebook Graph API */ }
class InstagramPostFeature implements IPostFeature { /* Instagram API via Facebook */ }
class LinkedInPostFeature implements IPostFeature { /* LinkedIn Marketing API */ }

// Platform adapter exposes capabilities
class FacebookAdapter extends BasePlatformAdapter {
  readonly features = {
    post: new FacebookPostFeature(),
    comment: new FacebookCommentFeature(),
    like: new FacebookLikeFeature(),
    // ... 27 total features
  };
}
```

**Benefits:**
- Workflows can be written once and run on any platform that supports the feature
- Easy to add new platforms (implement the same interfaces)
- Features can be toggled per-platform (some platforms may not support all features)

### Capability Registry Pattern

**Problem:** Different platforms have different capabilities (e.g., Instagram supports Reels, LinkedIn doesn't).

**Solution:** Each adapter registers its capabilities at runtime.

```typescript
interface PlatformCapability {
  feature: string;  // e.g., "post", "reel", "story"
  supported: boolean;
  limitations?: string[];  // e.g., ["max 10 images", "video < 60s"]
  rateLimit?: { requests: number; window: string };  // e.g., {requests: 200, window: "1h"}
}

class FacebookAdapter extends BasePlatformAdapter {
  getCapabilities(): PlatformCapability[] {
    return [
      { feature: 'post', supported: true, rateLimit: { requests: 200, window: '1h' } },
      { feature: 'reel', supported: true, limitations: ['video < 90s', 'aspect ratio 9:16'] },
      { feature: 'story', supported: true, limitations: ['expires 24h'] },
      { feature: 'live', supported: true, limitations: ['requires page admin'] },
      // ... all 27 features
    ];
  }
}
```

**Usage:**
- Workflow builder shows only features supported by selected platforms
- Runtime checks prevent unsupported operations
- Documentation auto-generates platform comparison table

### Entity Resolution Pattern

**Problem:** The same person exists across multiple platforms (e.g., john@example.com on Facebook, @john on Twitter, John Doe on LinkedIn) but is stored as separate entities.

**Solution:** Universal entity resolution with confidence scoring.

```typescript
interface UnifiedEntity {
  id: string;  // USAMKO global entity ID
  type: 'person' | 'company' | 'content';
  confidence: number;  // 0-1, how certain we are this is the same entity
  sources: EntitySource[];  // Which platforms contributed data
  canonicalData: Record<string, any>;  // Merged/deduplicated fields
  relationships: EntityRelationship[];  // Connections to other entities
}

interface EntitySource {
  platform: string;  // 'facebook', 'linkedin', etc.
  platformEntityId: string;  // Platform-specific ID
  lastSynced: Date;
  fields: Record<string, any>;  // Raw platform data
}

// Resolution rules
const RESOLUTION_RULES = [
  { match: 'email', weight: 0.9, type: 'exact' },
  { match: 'phone', weight: 0.8, type: 'exact' },
  { match: 'name + company', weight: 0.7, type: 'fuzzy' },
  { match: 'name + location', weight: 0.6, type: 'fuzzy' },
  { match: 'profile_picture', weight: 0.5, type: 'vision' },  // Face recognition
];
```

**Storage:** Neo4j graph database for relationships + PostgreSQL for entity data.

**Benefits:**
- Unified view of a person across all platforms
- Avoid duplicate outreach (don't message the same person on 3 platforms)
- Cross-platform journey tracking (saw ad on Facebook → clicked link → signed up)

### Plugin Architecture

**Principle:** Each platform adapter is an independent plugin that can be installed/uninstalled without affecting others.

**Structure:**
```
plugins/
├── facebook/
│   ├── package.json           # Independent package, versioned separately
│   ├── plugin.manifest.json   # Metadata: name, version, capabilities, dependencies
│   ├── src/
│   │   ├── FacebookAdapter.ts
│   │   ├── features/          # 27 feature implementations
│   │   ├── api/               # Facebook Graph API client
│   │   └── index.ts           # Plugin entry point
│   └── tests/
├── instagram/
├── linkedin/
└── ...
```

**Manifest Schema:**
```typescript
interface PluginManifest {
  id: string;  // 'com.usamko.platform.facebook'
  name: string;
  version: string;  // Semantic versioning
  author: string;
  description: string;
  homepage: string;
  license: string;
  
  // What this plugin provides
  capabilities: PlatformCapability[];
  
  // What this plugin needs
  dependencies: {
    '@usamko/core': string;  // Minimum core version
    '@usamko/browser-sdk'?: string;  // Optional dependencies
  };
  
  // OAuth configuration for platform
  oauth: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  
  // Rate limits
  rateLimits: {
    default: { requests: number; window: string };
    perFeature?: Record<string, { requests: number; window: string }>;
  };
}
```

**Lifecycle:**
```typescript
interface IPlugin {
  onLoad(): Promise<void>;         // Initialize plugin
  onEnable(): Promise<void>;       // User enabled in settings
  onDisable(): Promise<void>;      // User disabled in settings
  onUnload(): Promise<void>;       // Uninstalling plugin
  getAdapter(): IPlatformAdapter;  // Get the adapter instance
}
```

### Enterprise Service Bus (ESB)

**Purpose:** Service-to-service communication with guaranteed delivery and routing.

**Implementation:** RabbitMQ with topic-based routing.

**Event Schema:**
```typescript
interface DomainEvent {
  id: string;  // UUID
  type: string;  // 'user.registered', 'workflow.completed', etc.
  source: string;  // Service that emitted the event
  timestamp: Date;
  tenantId: string;  // Multi-tenant isolation
  userId?: string;
  data: Record<string, any>;
  metadata: {
    correlationId: string;  // For distributed tracing
    causationId?: string;   // Event that caused this event
  };
}
```

**Routing:**
```
Exchange: 'platform.events' (topic)
├── user.*                  → UserService queue
├── workflow.*              → WorkflowService queue
├── browser.*               → BrowserService queue
├── *.failed                → DeadLetterQueue (retry with exponential backoff)
└── #                       → AuditLog queue (all events)
```

**Patterns:**
- **Fire-and-Forget:** Emit event, don't wait for response (async)
- **Request-Reply:** RPC pattern with correlation ID (sync over async)
- **Saga Pattern:** Multi-step distributed transactions with compensation

**Example:**
```typescript
// Emit event
await eventBus.publish('workflow.completed', {
  workflowId: '123',
  duration: 5000,
  status: 'success',
});

// Subscribe to event
@EventHandler('workflow.completed')
async handleWorkflowCompleted(event: DomainEvent) {
  // Update analytics, send notifications, etc.
}
```

---

## Migration Strategy: v1.0 → v2.0

### Approach: Clean Slate with Data Bridge

**Decision:** **Do not extend v1.0 codebase**. Build v2.0 from scratch in parallel.

**Rationale:**
- v1.0 is .NET, v2.0 is Node.js (different ecosystems)
- v1.0 is mostly stubs, not production-ready
- Clean architecture is faster than refactoring technical debt
- Can run both systems in parallel during migration

### Data Migration

**Strategy:**
1. **Export v1.0 Data:** Build export scripts for PostgreSQL database (users, workflows, accounts)
2. **Transform to v2.0 Schema:** ETL pipeline (Prisma migrations + custom transformers)
3. **Import to v2.0:** Batch inserts with validation
4. **Verify Integrity:** Automated tests compare record counts, checksums

**Tool:** Custom NestJS CLI command (`pnpm migrate:v1-to-v2`)

### User Migration

**Strategy:**
1. **Grandfather Existing Users:** Import with same credentials (email + hashed password)
2. **Force Password Reset:** Email users to verify identity + set new password
3. **OAuth Re-Authorization:** Users must re-authorize platform accounts (security best practice)
4. **Workflow Conversion:** Convert v1.0 JSON workflows to v2.0 Temporal workflows (best-effort, manual review)

### Rollout Plan

**Phase 1: Alpha (Internal Testing)**
- Deploy v2.0 to staging environment
- Internal team tests all core features
- Duration: 4 weeks

**Phase 2: Beta (Invite-Only)**
- Invite 100 beta users from v1.0
- Migrate their data, provide support
- Collect feedback, fix critical bugs
- Duration: 8 weeks

**Phase 3: Public Release**
- Open v2.0 to all users
- Keep v1.0 running read-only for 90 days (export-only)
- Email campaigns to encourage migration
- Duration: 12 weeks

**Phase 4: v1.0 Sunset**
- Shut down v1.0 servers
- Archive codebase
- Duration: 1 week

---

## Development Phases

### Phase 1: Foundation (Months 1-3)

**Goal:** Core infrastructure + identity + 1 platform adapter (proof of concept)

**Deliverables:**
1. NestJS project setup (monorepo, modules, DI)
2. PostgreSQL + Redis + RabbitMQ (Docker Compose)
3. Authentication (OAuth + JWT)
4. Multi-tenant isolation (tenant_id + RLS)
5. Facebook adapter (post, comment, like - 3 features)
6. Basic workflow engine (run simple workflows)
7. Admin UI (Next.js + shadcn/ui)

**Team:** 3 backend engineers, 1 frontend engineer, 1 DevOps engineer

**Success Metrics:**
- User can register, login, connect Facebook account
- User can schedule a Facebook post via UI
- System handles 100 concurrent workflows

### Phase 2: Platform Expansion (Months 4-6)

**Goal:** Add 5 more platform adapters + visual workflow builder

**Deliverables:**
1. Instagram adapter (all features that Facebook has)
2. LinkedIn adapter (post, company page management)
3. Twitter/X adapter (tweet, thread, DM)
4. WhatsApp Business adapter (send messages, manage contacts)
5. Telegram adapter (send messages, bot commands)
6. Visual workflow builder (drag-and-drop nodes, connect actions)
7. Workflow templates library (10 pre-built workflows)

**Team:** 5 backend engineers, 2 frontend engineers, 1 designer

**Success Metrics:**
- All 6 platforms can post content
- User can build a workflow without writing code
- 80% feature parity with v1.0

### Phase 3: AI Integration (Months 7-9)

**Goal:** AI-powered content generation + autonomous agents

**Deliverables:**
1. LangGraph orchestration layer
2. OpenAI + Claude + Gemini + Ollama integrations
3. AI content generation (text, image, video captions)
4. AI sentiment analysis + hashtag suggestions
5. Browser AI agent (vision-based navigation)
6. Self-healing selectors (DOM changes don't break workflows)
7. MCP server (expose USAMKO tools to Claude Desktop)

**Team:** 3 AI/ML engineers, 2 backend engineers

**Success Metrics:**
- AI generates 1000 posts/day without human review
- Browser agent completes 95% of tasks without failures
- External AI tools can call USAMKO via MCP

### Phase 4: Data Intelligence (Months 10-12)

**Goal:** Knowledge graph + entity resolution + analytics

**Deliverables:**
1. Neo4j knowledge graph (entities + relationships)
2. Entity resolution engine (cross-platform identity matching)
3. Qdrant vector store (semantic search)
4. Elasticsearch full-text search
5. ClickHouse analytics (dashboards, reports)
6. Real-time metrics (WebSocket updates)
7. Data enrichment pipeline (3rd-party APIs)

**Team:** 2 data engineers, 1 backend engineer, 1 frontend engineer

**Success Metrics:**
- 90% entity resolution accuracy
- Sub-second search across 10M records
- Real-time dashboards update < 1s latency

### Phase 5: Enterprise Features (Months 13-15)

**Goal:** Multi-tenant + SSO + compliance + white-label

**Deliverables:**
1. Advanced RBAC (custom roles, permissions)
2. SSO (SAML, Active Directory)
3. Audit logs (immutable, tamper-proof)
4. GDPR/CCPA compliance tools (data export, deletion)
5. White-label UI (custom branding per tenant)
6. SLA monitoring (uptime, response time)
7. Enterprise support portal

**Team:** 2 backend engineers, 1 frontend engineer, 1 compliance specialist

**Success Metrics:**
- SOC 2 Type II certification
- 99.9% uptime SLA
- 10+ enterprise customers

### Phase 6: Scale & Optimize (Months 16-18)

**Goal:** 10,000 concurrent workflows + multi-region

**Deliverables:**
1. Kubernetes deployment (EKS, GKE, or AKS)
2. Horizontal pod autoscaling
3. Multi-region setup (US, EU, APAC)
4. CDN for static assets (CloudFront)
5. Database sharding (tenant-based)
6. Performance testing (load tests, stress tests)
7. Cost optimization (spot instances, reserved instances)

**Team:** 2 DevOps engineers, 1 backend engineer, 1 SRE

**Success Metrics:**
- Handle 10,000 concurrent workflows
- p99 latency < 1s
- 50% infrastructure cost reduction

---

## Conclusion (Part 1)

This document establishes the architectural foundation for USAMKO v2.0. It resolves all technology stack conflicts (NestJS is the chosen backend, not Python or .NET), defines clear design principles (legitimate use, platform compliance), and provides a 5-layer execution model with 21 specialized "Operating Systems."

The platform will be built as a **Modular Monolith** with clear boundaries for future microservices extraction. It prioritizes **developer experience**, **performance at scale**, and **security by design**.

**Continue to Part 2** for the complete specification of:
- 19 Core Domains (700+ modules, 4,000+ services)
- 35+ Platform Adapters (Facebook, Instagram, LinkedIn, WhatsApp, etc.)
- Feature Catalog (universal capabilities)
- AI Platform (25+ modules)
- Knowledge Graph & Entity Resolution
- Implementation roadmap with detailed module breakdowns

---

**Document Control:**
- **Authors:** USAMKO Platform Architecture Team
- **Reviewers:** CTO, Lead Architect, Security Team
- **Approval Date:** 2026-07-26
- **Next Review:** Quarterly (October 2026)
- **Version History:**
  - v2.0.0 (2026-07-26): Initial master specification consolidating 24+ architectural documents
  - v1.0.0 (Legacy): .NET-based Sender Pro architecture (deprecated)
