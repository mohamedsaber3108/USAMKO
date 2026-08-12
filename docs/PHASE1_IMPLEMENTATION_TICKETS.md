# Phase 1 Implementation Tickets (Months 1-4)

**Goal:** MVP Foundation - Core platform + 5 social platforms + basic workflows  
**Team:** 8 people (5 backend, 2 frontend, 1 DevOps)  
**Duration:** 4 months  
**Budget:** $500K

---

## Epic 1: Project Setup & Infrastructure (Week 1-2)

### Ticket 1.1: Initialize Project Structure

**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Story Points:** 3  
**Dependencies:** None

**Description:**
Set up monorepo with NestJS backend + Next.js frontend.

**Acceptance Criteria:**

- [ ] Turborepo or Nx monorepo configured
- [ ] NestJS backend app initialized (`apps/api`)
- [ ] Next.js frontend app initialized (`apps/web`)
- [ ] Shared packages created (`packages/types`, `packages/utils`)
- [ ] TypeScript 5+ configured (strict mode)
- [ ] ESLint + Prettier configured
- [ ] Husky pre-commit hooks enabled
- [ ] `pnpm install` works without errors

**Technical Notes:**

```bash
# Project structure
usamko/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
└── package.json
```

---

### Ticket 1.2: Set Up Development Environment

**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Story Points:** 5  
**Dependencies:** 1.1

**Description:**
Docker Compose for local development (PostgreSQL, Redis, RabbitMQ).

**Acceptance Criteria:**

- [ ] `docker-compose.yml` created with services:
  - PostgreSQL 16
  - Redis 7
  - RabbitMQ 3.12
  - MinIO (S3-compatible storage)
- [ ] Environment variables documented in `.env.example`
- [ ] `docker-compose up` starts all services
- [ ] Health checks pass for all services
- [ ] Seed data script created (test users, workflows)

**Technical Notes:**

```yaml
# docker-compose.yml snippet
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: usamko
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: usamko_dev
    ports:
      - '5432:5432'
```

---

### Ticket 1.3: Set Up CI/CD Pipeline

**Type:** Task  
**Priority:** High  
**Assignee:** DevOps Engineer  
**Story Points:** 5  
**Dependencies:** 1.1

**Description:**
GitHub Actions for automated testing and deployment.

**Acceptance Criteria:**

- [ ] `.github/workflows/ci.yml` created
- [ ] Pipeline runs on every PR:
  - Lint (ESLint)
  - Type-check (tsc)
  - Unit tests (Vitest)
  - Build (NestJS + Next.js)
- [ ] Branch protection rules configured (require CI pass)
- [ ] Auto-deploy to staging on merge to `main`
- [ ] Pipeline completes in < 10 minutes

---

### Ticket 1.4: Set Up Database with Prisma

**Type:** Task  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** 1.2

**Description:**
Configure Prisma ORM with initial schema.

**Acceptance Criteria:**

- [ ] Prisma installed and configured
- [ ] Initial schema defined (`schema.prisma`):
  - User model
  - Tenant model
  - PlatformAccount model
- [ ] Migrations created
- [ ] Prisma Client generated
- [ ] Connection pooling configured (max 10 connections)
- [ ] `npx prisma migrate dev` works

**Technical Notes:**

```prisma
// schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Epic 2: Core Platform (Week 3-4)

### Ticket 2.1: Configuration Management

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** 1.4

**Description:**
Implement configuration service with environment variables + validation.

**Acceptance Criteria:**

- [ ] `ConfigModule` created (NestJS)
- [ ] Load config from `.env` files
- [ ] Zod schema validation for all config
- [ ] Typed config interface exported
- [ ] Error on missing required config
- [ ] Test coverage > 80%

**Code Example:**

```typescript
const ConfigSchema = z.object({
  database: z.object({
    url: z.string().url(),
    maxConnections: z.number().min(1).max(100),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
  }),
});
```

---

### Ticket 2.2: Health Check Endpoints

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 2  
**Dependencies:** 2.1

**Description:**
Add health check endpoints for Kubernetes probes.

**Acceptance Criteria:**

- [ ] `GET /health/liveness` returns 200 (is app alive?)
- [ ] `GET /health/readiness` returns 200 (is app ready for traffic?)
- [ ] Readiness checks dependencies:
  - PostgreSQL connection
  - Redis connection
  - RabbitMQ connection
- [ ] Response includes version, uptime, dependency status
- [ ] Returns 503 if any dependency unhealthy

**API Response:**

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 86400,
  "checks": {
    "postgres": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 2 }
  }
}
```

---

### Ticket 2.3: Event Bus (In-Process)

**Type:** Feature  
**Priority:** Medium  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** 2.1

**Description:**
Implement in-process event bus for module communication.

**Acceptance Criteria:**

- [ ] `EventBusService` created
- [ ] `emit(event, data)` method
- [ ] `on(event, handler)` method (subscribe)
- [ ] Type-safe event definitions
- [ ] Test coverage > 80%

**Code Example:**

```typescript
// Emit event
eventBus.emit('user.registered', { userId: '123', email: 'user@example.com' });

// Subscribe
eventBus.on('user.registered', async data => {
  console.log(`Welcome ${data.email}!`);
});
```

---

### Ticket 2.4: Rate Limiting Middleware

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** 2.1, 1.2 (Redis)

**Description:**
Redis-based rate limiting per user/IP.

**Acceptance Criteria:**

- [ ] `RateLimitGuard` created (NestJS guard)
- [ ] Token bucket algorithm implemented
- [ ] Configurable limits (per endpoint, per tier)
- [ ] Returns `429 Too Many Requests` when exceeded
- [ ] Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] Test coverage > 80%

**Rate Limits:**

- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise: Custom

---

### Ticket 2.5: Caching Service

**Type:** Feature  
**Priority:** Medium  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 1.2 (Redis)

**Description:**
Multi-level caching (L1 in-memory, L2 Redis).

**Acceptance Criteria:**

- [ ] `CacheService` created
- [ ] `get<T>(key)`, `set<T>(key, value, ttl)` methods
- [ ] L1 cache (in-memory Map, 1-minute TTL)
- [ ] L2 cache (Redis, configurable TTL)
- [ ] Cache invalidation by key
- [ ] Cache invalidation by tag
- [ ] `@Cacheable()` decorator for methods
- [ ] Test coverage > 80%

**Code Example:**

```typescript
@Cacheable({ ttl: 300, tags: ['user'] })
async getUserById(id: string): Promise<User> {
  return this.userRepo.findOne({ id });
}
```

---

## Epic 3: Identity & Security (Week 5-6)

### Ticket 3.1: User Registration & Login

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 1.4 (Prisma)

**Description:**
Email/password authentication with JWT tokens.

**Acceptance Criteria:**

- [ ] `POST /auth/register` - Register new user
- [ ] `POST /auth/login` - Login user
- [ ] `POST /auth/logout` - Logout user
- [ ] `POST /auth/refresh` - Refresh access token
- [ ] Passwords hashed with Argon2id
- [ ] JWT access token (15-minute expiry)
- [ ] Refresh token (7-day expiry, stored in DB)
- [ ] Email validation (valid format)
- [ ] Password validation (12 chars, 1 uppercase, 1 lowercase, 1 number)
- [ ] Test coverage > 80%

**API Example:**

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "rt_abc123...",
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

---

### Ticket 3.2: OAuth Integration (Google, GitHub)

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 3.1

**Description:**
OAuth 2.0 login with Google and GitHub.

**Acceptance Criteria:**

- [ ] `GET /auth/google` - Redirect to Google OAuth
- [ ] `GET /auth/google/callback` - Handle callback
- [ ] `GET /auth/github` - Redirect to GitHub OAuth
- [ ] `GET /auth/github/callback` - Handle callback
- [ ] Create user if doesn't exist (email from OAuth)
- [ ] Link OAuth account to existing user if email matches
- [ ] Return JWT tokens on successful OAuth
- [ ] Test with real OAuth (dev credentials)

---

### Ticket 3.3: Multi-Tenancy Setup

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 1.4, 3.1

**Description:**
Multi-tenant isolation with `tenant_id` column + RLS.

**Acceptance Criteria:**

- [ ] `Tenant` model created (Prisma)
- [ ] All models have `tenantId` foreign key
- [ ] Middleware extracts tenant from subdomain or custom domain
- [ ] Middleware sets `tenant_id` in database context
- [ ] PostgreSQL Row-Level Security (RLS) enabled
- [ ] Test: User A cannot access User B's data (different tenants)
- [ ] Test: Admin can access all tenants

**Prisma Schema:**

```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  users     User[]
  workflows Workflow[]
  createdAt DateTime @default(now())
}

model User {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  email     String
  @@unique([tenantId, email])
}
```

---

### Ticket 3.4: RBAC (Role-Based Access Control)

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 3.3

**Description:**
Implement roles and permissions (Admin, User, Viewer).

**Acceptance Criteria:**

- [ ] `Role` enum: `ADMIN`, `USER`, `VIEWER`
- [ ] User model has `role` field
- [ ] `@RequirePermission()` decorator
- [ ] Permissions checked in guard
- [ ] Permissions: `user:read`, `user:write`, `workflow:read`, `workflow:write`, etc.
- [ ] Admin can do everything
- [ ] User can CRUD own resources
- [ ] Viewer can only read
- [ ] Test coverage > 80%

**Code Example:**

```typescript
@Post('/workflows')
@RequirePermission('workflow:create')
async createWorkflow(@Body() dto: CreateWorkflowDto) {
  // Only users with workflow:create permission can call this
}
```

---

## Epic 4: Browser Platform (Week 7-8)

### Ticket 4.1: Playwright Integration

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 2.1

**Description:**
Initialize Playwright for browser automation.

**Acceptance Criteria:**

- [ ] Playwright installed (`@playwright/test`)
- [ ] `BrowserService` created
- [ ] `launchBrowser()` method (returns Browser instance)
- [ ] Support Chromium, Firefox, WebKit
- [ ] Headless mode configurable
- [ ] Browser pool (reuse instances, max 5 concurrent)
- [ ] Close browser on idle (5-minute timeout)
- [ ] Test: Launch browser, navigate to page, take screenshot

---

### Ticket 4.2: Browser Profile Management

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 4.1, 1.4

**Description:**
Persistent browser profiles (cookies, localStorage, sessions).

**Acceptance Criteria:**

- [ ] `BrowserProfile` model created (Prisma)
- [ ] `createProfile(userId, platform)` method
- [ ] `loadProfile(profileId)` method - Launch browser with profile
- [ ] `saveProfile(profileId)` method - Save cookies/localStorage to MinIO
- [ ] Profile data stored as `.zip` in MinIO
- [ ] Each profile isolated (separate directory)
- [ ] Test: Create profile, save cookies, load profile, cookies persist

**Schema:**

```prisma
model BrowserProfile {
  id            String   @id @default(uuid())
  tenantId      String
  userId        String
  name          String
  platform      String   // 'facebook', 'instagram', etc.
  storageUrl    String   // MinIO path to profile.zip
  lastUsedAt    DateTime
  createdAt     DateTime @default(now())
}
```

---

## Epic 5: Automation Engine (Week 9-12)

### Ticket 5.1: Workflow Schema Definition

**Type:** Task  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** 1.4

**Description:**
Define Workflow and WorkflowExecution models.

**Acceptance Criteria:**

- [ ] `Workflow` model created (Prisma)
- [ ] `WorkflowExecution` model created
- [ ] Workflow has: name, description, definition (JSON), status, version
- [ ] Definition schema: nodes (array), edges (array), variables (array)
- [ ] Node types: trigger, action, condition, loop, delay
- [ ] Execution has: workflowId, status, input, output, startedAt, completedAt

**Prisma Schema:**

```prisma
model Workflow {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  description String?
  definition  Json     // { nodes: [...], edges: [...] }
  status      String   // 'draft', 'active', 'paused'
  createdAt   DateTime @default(now())
}

model WorkflowExecution {
  id          String   @id @default(uuid())
  workflowId  String
  status      String   // 'running', 'completed', 'failed'
  input       Json?
  output      Json?
  startedAt   DateTime @default(now())
  completedAt DateTime?
}
```

---

### Ticket 5.2: Workflow Engine (Basic Execution)

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 5.1

**Description:**
Execute workflows with simple node types (action, delay).

**Acceptance Criteria:**

- [ ] `WorkflowEngineService` created
- [ ] `execute(workflowId, input?)` method
- [ ] Execute nodes in topological order (resolve dependencies)
- [ ] Support node types:
  - Action (call platform adapter method)
  - Delay (wait N seconds)
- [ ] Store execution result in database
- [ ] Handle errors (mark execution as failed)
- [ ] Test: Create workflow with 3 steps, execute, verify results

**Execution Flow:**

```typescript
// Workflow definition
{
  nodes: [
    { id: 'node1', type: 'action', config: { action: 'facebook.post', params: { text: 'Hello' } } },
    { id: 'node2', type: 'delay', config: { duration: 5000 } },
    { id: 'node3', type: 'action', config: { action: 'twitter.post', params: { text: 'Hi' } } },
  ],
  edges: [
    { source: 'node1', target: 'node2' },
    { source: 'node2', target: 'node3' },
  ],
}

// Execute
await workflowEngine.execute(workflow.id);
```

---

### Ticket 5.3: Workflow Scheduler (Cron)

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 5.2

**Description:**
Schedule workflows to run at specific times (cron expressions).

**Acceptance Criteria:**

- [ ] `WorkflowSchedule` model created (Prisma)
- [ ] `createSchedule(workflowId, cronExpression)` method
- [ ] Background job runs every minute (checks schedules)
- [ ] Execute workflow if scheduled time reached
- [ ] Update `nextRunAt` after execution
- [ ] Support cron expressions: `0 9 * * *` (9 AM daily)
- [ ] Test: Schedule workflow for 1 minute from now, verify it executes

**Schema:**

```prisma
model WorkflowSchedule {
  id             String   @id @default(uuid())
  workflowId     String
  cronExpression String
  enabled        Boolean  @default(true)
  nextRunAt      DateTime
  lastRunAt      DateTime?
  createdAt      DateTime @default(now())
}
```

---

### Ticket 5.4: Visual Workflow Builder (Frontend)

**Type:** Feature  
**Priority:** High  
**Assignee:** Frontend Engineer  
**Story Points:** 13  
**Dependencies:** 5.1

**Description:**
Drag-and-drop workflow builder using React Flow.

**Acceptance Criteria:**

- [ ] Install React Flow library
- [ ] Workflow canvas with zoom/pan
- [ ] Node palette (sidebar with draggable nodes)
- [ ] Drag node from palette to canvas
- [ ] Connect nodes with edges
- [ ] Click node to open config panel
- [ ] Save workflow to API
- [ ] Load existing workflow
- [ ] Test: Create workflow with 5 nodes, save, reload, verify nodes/edges persist

**UI Mockup:**

```
┌─────────────────────────────────────────────────┐
│ [Node Palette]  │  [Canvas]        │ [Config]  │
│ ┌──────────┐    │                  │           │
│ │ Trigger  │    │  [Node1]         │ Node1     │
│ └──────────┘    │     ↓            │ Type:     │
│ ┌──────────┐    │  [Node2]         │ Action    │
│ │ Action   │    │     ↓            │ Platform: │
│ └──────────┘    │  [Node3]         │ Facebook  │
│ ┌──────────┐    │                  │ Method:   │
│ │ Delay    │    │                  │ post      │
│ └──────────┘    │                  │           │
└─────────────────────────────────────────────────┘
```

---

## Epic 6: Social Platform Adapters (Week 13-16)

### Ticket 6.1: Facebook Adapter - Post Feature

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 1.4, 4.1

**Description:**
Implement Facebook post creation via Graph API.

**Acceptance Criteria:**

- [ ] `FacebookAdapter` class created
- [ ] `FacebookPostFeature` implements `IPostFeature`
- [ ] `create(content, options)` method - Create Facebook post
- [ ] `get(postId)` method - Get post by ID
- [ ] `list(options)` method - List posts
- [ ] `delete(postId)` method - Delete post
- [ ] OAuth token management (refresh if expired)
- [ ] Rate limiting (200 requests/hour)
- [ ] Support text, images (max 10), videos, links
- [ ] Test with real Facebook account

**API Integration:**

```typescript
// Facebook Graph API
POST /v18.0/{page-id}/feed
{
  "message": "Check out our new feature!",
  "link": "https://example.com",
  "access_token": "..."
}
```

---

### Ticket 6.2: Instagram Adapter - Post Feature

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 6.1

**Description:**
Implement Instagram post creation via Graph API.

**Acceptance Criteria:**

- [ ] `InstagramAdapter` class created
- [ ] `InstagramPostFeature` implements `IPostFeature`
- [ ] `create(content, options)` method - Create Instagram post
- [ ] Support images, carousels (max 10), videos
- [ ] Hashtags (max 30 per post)
- [ ] Location tagging
- [ ] Test with real Instagram Business account

---

### Ticket 6.3: LinkedIn Adapter - Post Feature

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 6.1

**Description:**
Implement LinkedIn post creation via Marketing API.

**Acceptance Criteria:**

- [ ] `LinkedInAdapter` class created
- [ ] `LinkedInPostFeature` implements `IPostFeature`
- [ ] `create(content, options)` method - Create LinkedIn post
- [ ] Support text, images, videos, documents, polls
- [ ] Company page posts (post as organization)
- [ ] Test with real LinkedIn account

---

### Ticket 6.4: Twitter Adapter - Tweet Feature

**Type:** Feature  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 6.1

**Description:**
Implement Twitter tweet creation via v2 API.

**Acceptance Criteria:**

- [ ] `TwitterAdapter` class created
- [ ] `TwitterPostFeature` implements `IPostFeature`
- [ ] `create(content, options)` method - Create tweet
- [ ] 280 character limit
- [ ] Support images (max 4), videos, GIFs
- [ ] Thread creation (connect tweets)
- [ ] Test with real Twitter account

---

### Ticket 6.5: WhatsApp Business Adapter - Message Feature

**Type:** Feature  
**Priority:** Medium  
**Assignee:** Backend Engineer  
**Story Points:** 8  
**Dependencies:** 6.1

**Description:**
Implement WhatsApp message sending via Business API.

**Acceptance Criteria:**

- [ ] `WhatsAppAdapter` class created
- [ ] `WhatsAppMessageFeature` implements `IMessageFeature`
- [ ] `send(recipientId, message)` method - Send message
- [ ] Support text, images, videos, documents, location
- [ ] Template messages (pre-approved by WhatsApp)
- [ ] 24-hour messaging window enforcement
- [ ] Test with real WhatsApp Business account

---

## Epic 7: Frontend (Week 13-16)

### Ticket 7.1: Authentication UI (Login/Register)

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Frontend Engineer  
**Story Points:** 5  
**Dependencies:** 3.1, 3.2

**Acceptance Criteria:**

- [ ] Login page (`/login`)
- [ ] Register page (`/register`)
- [ ] Email/password form with validation
- [ ] OAuth buttons (Google, GitHub)
- [ ] JWT stored in httpOnly cookie
- [ ] Redirect to dashboard on successful login
- [ ] Show error messages on failure
- [ ] Responsive design (mobile-friendly)

---

### Ticket 7.2: Dashboard (Main UI)

**Type:** Feature  
**Priority:** Critical  
**Assignee:** Frontend Engineer  
**Story Points:** 8  
**Dependencies:** 7.1

**Acceptance Criteria:**

- [ ] Dashboard page (`/dashboard`)
- [ ] Sidebar navigation (Workflows, Platforms, Analytics, Settings)
- [ ] Top bar (user menu, notifications)
- [ ] Stats cards (workflows executed, posts published, platforms connected)
- [ ] Recent activity feed
- [ ] Responsive design

---

### Ticket 7.3: Platform Connections Page

**Type:** Feature  
**Priority:** High  
**Assignee:** Frontend Engineer  
**Story Points:** 5  
**Dependencies:** 7.2, 6.1-6.5

**Acceptance Criteria:**

- [ ] Platforms page (`/platforms`)
- [ ] List of available platforms (Facebook, Instagram, LinkedIn, Twitter, WhatsApp)
- [ ] "Connect" button for each platform (triggers OAuth)
- [ ] Show connected platforms with status (green = connected, red = disconnected)
- [ ] "Disconnect" button for connected platforms
- [ ] Test: Connect Facebook account, verify in database

---

### Ticket 7.4: Workflows List Page

**Type:** Feature  
**Priority:** High  
**Assignee:** Frontend Engineer  
**Story Points:** 5  
**Dependencies:** 7.2, 5.1

**Acceptance Criteria:**

- [ ] Workflows page (`/workflows`)
- [ ] Table: Name, Status, Last Run, Actions
- [ ] "Create Workflow" button (opens builder)
- [ ] "Edit" button (opens builder)
- [ ] "Delete" button (with confirmation)
- [ ] "Execute" button (runs workflow immediately)
- [ ] Pagination (25 per page)

---

## Epic 8: Testing & QA (Week 15-16)

### Ticket 8.1: Unit Tests (Backend)

**Type:** Task  
**Priority:** High  
**Assignee:** All Backend Engineers  
**Story Points:** 8  
**Dependencies:** All backend features

**Description:**
Achieve 80%+ test coverage for backend services.

**Acceptance Criteria:**

- [ ] All services have unit tests (Vitest)
- [ ] Test coverage > 80% (lines, branches)
- [ ] Tests run in CI pipeline
- [ ] Mock external APIs (Facebook, OpenAI, etc.)
- [ ] Test database interactions with in-memory SQLite

---

### Ticket 8.2: Integration Tests (API)

**Type:** Task  
**Priority:** High  
**Assignee:** Backend Engineer  
**Story Points:** 5  
**Dependencies:** 3.1, 5.2, 6.1

**Description:**
End-to-end API tests with real database.

**Acceptance Criteria:**

- [ ] Test user registration → login → create workflow → execute
- [ ] Test platform connection → post creation
- [ ] Use test database (Docker Compose)
- [ ] Tests run in CI pipeline
- [ ] Clean up data after tests

---

### Ticket 8.3: E2E Tests (Frontend)

**Type:** Task  
**Priority:** Medium  
**Assignee:** Frontend Engineer  
**Story Points:** 5  
**Dependencies:** 7.1-7.4

**Description:**
End-to-end tests with Playwright.

**Acceptance Criteria:**

- [ ] Test user registration flow
- [ ] Test login flow
- [ ] Test create workflow flow
- [ ] Test connect platform flow
- [ ] Tests run in headless mode
- [ ] Screenshots on failure

---

### Ticket 8.4: Performance Testing

**Type:** Task  
**Priority:** Medium  
**Assignee:** Backend Engineer  
**Story Points:** 3  
**Dependencies:** All features

**Description:**
Load test with 100 concurrent users.

**Acceptance Criteria:**

- [ ] Use k6 or Artillery for load testing
- [ ] Test scenarios:
  - 100 users creating workflows
  - 100 concurrent workflow executions
  - 100 API requests/second
- [ ] Measure: Response time (p95 < 500ms), error rate (< 1%)
- [ ] Generate report

---

## Epic 9: Deployment (Week 16)

### Ticket 9.1: Production Environment Setup

**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Story Points:** 8  
**Dependencies:** 1.3

**Description:**
Set up production infrastructure on AWS.

**Acceptance Criteria:**

- [ ] AWS account configured
- [ ] VPC created (public + private subnets)
- [ ] RDS PostgreSQL instance (production-grade)
- [ ] ElastiCache Redis cluster
- [ ] S3 bucket for MinIO storage
- [ ] CloudFront CDN
- [ ] Load balancer (ALB)
- [ ] Auto-scaling group (ECS or EKS)
- [ ] Domain configured (usamko.com)
- [ ] SSL certificate (Let's Encrypt or ACM)

---

### Ticket 9.2: Monitoring & Alerting

**Type:** Task  
**Priority:** High  
**Assignee:** DevOps Engineer  
**Story Points:** 5  
**Dependencies:** 9.1

**Description:**
Set up monitoring with Prometheus + Grafana.

**Acceptance Criteria:**

- [ ] Prometheus installed
- [ ] Grafana dashboards:
  - API request rate
  - Response time (p50, p95, p99)
  - Error rate
  - Database connection pool
  - Redis hit rate
- [ ] Alerts configured (Slack/PagerDuty):
  - Error rate > 1%
  - Response time p95 > 1s
  - Database connection pool > 80%
- [ ] Logs shipped to Loki or CloudWatch

---

### Ticket 9.3: Production Deployment

**Type:** Task  
**Priority:** Critical  
**Assignee:** DevOps Engineer  
**Story Points:** 3  
**Dependencies:** 9.1, 9.2, All features

**Description:**
Deploy v2.0 MVP to production.

**Acceptance Criteria:**

- [ ] Docker images built and pushed to ECR
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] Health checks pass
- [ ] Application accessible at https://app.usamko.com
- [ ] SSL certificate valid
- [ ] Test: Register user, create workflow, execute

---

## Summary

**Total Epics:** 9  
**Total Tickets:** 41  
**Total Story Points:** 218

**By Priority:**

- Critical: 16 tickets (MVP blockers)
- High: 15 tickets (Important features)
- Medium: 10 tickets (Nice to have)

**By Type:**

- Feature: 28 tickets
- Task: 13 tickets

**Estimated Timeline:** 16 weeks (4 months)

**Success Criteria for Phase 1:**

- ✅ All 41 tickets completed
- ✅ 100 beta users onboarded
- ✅ 1,000 workflows executed
- ✅ 5,000 social posts published
- ✅ 95% uptime
- ✅ Sub-2s API response time
- ✅ 80%+ test coverage

---

## Next Steps

1. **Import tickets to GitHub Issues** (use GitHub CLI or API)
2. **Assign tickets to engineers**
3. **Set up sprint planning** (2-week sprints)
4. **Start Sprint 1** (Epics 1-2: Project Setup + Core Platform)

**Recommended Sprint Plan:**

- Sprint 1 (Week 1-2): Epics 1-2 (Setup + Core)
- Sprint 2 (Week 3-4): Epic 3 (Identity)
- Sprint 3 (Week 5-6): Epic 4 (Browser)
- Sprint 4 (Week 7-8): Epic 5 (Workflows Part 1)
- Sprint 5 (Week 9-10): Epic 5 (Workflows Part 2)
- Sprint 6 (Week 11-12): Epic 6 (Social Platforms Part 1)
- Sprint 7 (Week 13-14): Epics 6-7 (Social Platforms Part 2 + Frontend)
- Sprint 8 (Week 15-16): Epics 8-9 (Testing + Deployment)

---

**Document Version:** 1.0  
**Last Updated:** July 26, 2026  
**Author:** USAMKO Platform Team
