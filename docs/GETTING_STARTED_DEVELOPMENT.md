# Getting Started: USAMKO v2.0 Development

**Date:** July 27, 2026  
**Phase:** 1 (MVP Foundation)  
**Sprint:** 1 (Project Setup)  
**First Ticket:** 1.1 - Initialize Project Structure

---

## Prerequisites Checklist

Before you start coding, ensure you have:

- [x] Node.js 20+ installed (`node --version`)
- [x] pnpm installed (`npm install -g pnpm`)
- [x] Git installed
- [x] Docker Desktop installed (for PostgreSQL, Redis, etc.)
- [x] Visual Studio Code (or your preferred IDE)
- [ ] PostgreSQL client (optional, for debugging)

**Check your setup:**

```bash
node --version    # Should be v20+ or v22+
pnpm --version    # Should be 8.0+
git --version
docker --version
```

---

## Step 1: Create New Branch for Development

```bash
cd m:\USAMKO

# Create development branch from main
git checkout main
git pull origin main
git checkout -b feature/phase1-project-setup

# Or if you want to continue from docs branch:
git checkout docs/master-specification
git checkout -b feature/phase1-project-setup
```

---

## Step 2: Initialize Monorepo Structure

**Ticket 1.1: Initialize Project Structure**

### Option A: Use Turborepo (Recommended)

```bash
# Install Turborepo globally
pnpm install -g turbo

# Create new Turborepo structure
pnpm dlx create-turbo@latest

# When prompted:
# Where would you like to create your turborepo? → . (current directory)
# Which package manager do you want to use? → pnpm
```

This creates:

```
usamko/
├── apps/
│   ├── api/          # NestJS backend (we'll set this up)
│   └── web/          # Next.js frontend (we'll set this up)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   └── tsconfig/     # Shared TypeScript configs
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### Option B: Manual Setup (If you prefer full control)

```bash
# Initialize root package.json
pnpm init

# Create workspace structure
mkdir -p apps/api apps/web packages/types packages/utils

# Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "usamko",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.5",
    "prettier": "^3.2.5",
    "eslint": "^8.57.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
EOF
```

---

## Step 3: Set Up NestJS Backend (apps/api)

```bash
cd apps

# Create NestJS app
pnpm dlx @nestjs/cli new api

# When prompted:
# Which package manager would you like to use? → pnpm
# Would you like to use TypeScript? → Yes
# Enable strict mode? → Yes

cd api

# Install additional dependencies
pnpm add @nestjs/config @nestjs/typeorm @prisma/client
pnpm add -D prisma
pnpm add class-validator class-transformer
pnpm add @nestjs/passport passport passport-jwt
pnpm add bcrypt argon2
pnpm add @microsoft/playwright

# Initialize Prisma
pnpm prisma init
```

**Update `apps/api/package.json`:**

```json
{
  "name": "@usamko/api",
  "version": "2.0.0",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "test": "jest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

---

## Step 4: Set Up Next.js Frontend (apps/web)

```bash
cd ../  # Back to apps/

# Create Next.js app
pnpm dlx create-next-app@latest web

# When prompted:
# Would you like to use TypeScript? → Yes
# Would you like to use ESLint? → Yes
# Would you like to use Tailwind CSS? → Yes
# Would you like to use `src/` directory? → Yes
# Would you like to use App Router? → Yes
# Would you like to customize the default import alias? → No

cd web

# Install additional dependencies
pnpm add zustand          # State management
pnpm add @tanstack/react-query  # Data fetching
pnpm add react-hook-form zod @hookform/resolvers  # Forms
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu  # UI primitives
pnpm add axios            # HTTP client
```

**Update `apps/web/package.json`:**

```json
{
  "name": "@usamko/web",
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

---

## Step 5: Set Up Shared Packages

### Create `packages/types/package.json`

```bash
cd ../../packages/types

cat > package.json << 'EOF'
{
  "name": "@usamko/types",
  "version": "2.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
EOF

# Create src directory
mkdir src

# Create initial types file
cat > src/index.ts << 'EOF'
// Shared types across backend and frontend

export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay';
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}
EOF
```

### Create `packages/utils/package.json`

```bash
cd ../utils

cat > package.json << 'EOF'
{
  "name": "@usamko/utils",
  "version": "2.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
EOF

mkdir src

cat > src/index.ts << 'EOF'
// Shared utility functions

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function humanDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return sleep(delay);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}
EOF
```

---

## Step 6: Set Up Docker Compose (Development Environment)

**Ticket 1.2: Set Up Development Environment**

```bash
cd ../../  # Back to root

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: usamko-postgres
    environment:
      POSTGRES_USER: usamko
      POSTGRES_PASSWORD: dev_password_change_in_production
      POSTGRES_DB: usamko_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U usamko"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: usamko-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: usamko-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: usamko
      RABBITMQ_DEFAULT_PASS: dev_password_change_in_production
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: usamko-minio
    environment:
      MINIO_ROOT_USER: usamko
      MINIO_ROOT_PASSWORD: dev_password_change_in_production
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  minio_data:
EOF

# Create .env.example
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://usamko:dev_password_change_in_production@localhost:5432/usamko_dev"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL="amqp://usamko:dev_password_change_in_production@localhost:5672"

# MinIO (S3)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=usamko
MINIO_SECRET_KEY=dev_password_change_in_production
MINIO_USE_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
WEB_URL=http://localhost:3001
EOF

# Copy to .env
cp .env.example .env
```

**Start the services:**

```bash
docker-compose up -d

# Check health
docker-compose ps
```

---

## Step 7: Set Up Prisma Schema

**Ticket 1.4: Set Up Database with Prisma**

```bash
cd apps/api

# Edit prisma/schema.prisma
```

**Create `prisma/schema.prisma`:**

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Tenant model (multi-tenancy)
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  status    String   @default("active") // active, suspended, canceled
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users     User[]
  workflows Workflow[]

  @@map("tenants")
}

// User model
model User {
  id        String   @id @default(uuid())
  email     String
  password  String
  name      String
  role      String   @default("user") // admin, user, viewer
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workflows Workflow[]

  @@unique([tenantId, email])
  @@map("users")
}

// Workflow model
model Workflow {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  name        String
  description String?
  status      String   @default("draft") // draft, active, paused, archived
  definition  Json     // WorkflowDefinition as JSON
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  tenant     Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  executions WorkflowExecution[]

  @@map("workflows")
}

// Workflow Execution model
model WorkflowExecution {
  id          String    @id @default(uuid())
  workflowId  String
  status      String    @default("running") // running, completed, failed
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime  @default(now())
  completedAt DateTime?

  // Relations
  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@map("workflow_executions")
}
```

**Run migration:**

```bash
pnpm prisma migrate dev --name init

# Generate Prisma Client
pnpm prisma generate
```

---

## Step 8: Set Up ESLint & Prettier

```bash
cd ../../  # Back to root

# Create .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

# Create .eslintrc.js
cat > .eslintrc.js << 'EOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
EOF
```

---

## Step 9: Test Everything Works

```bash
# Install all dependencies
pnpm install

# Start dev servers
pnpm dev

# You should see:
# - API running on http://localhost:3000
# - Web running on http://localhost:3001
```

**Test backend:**

```bash
curl http://localhost:3000
# Should return: "Hello World!" or similar
```

**Test frontend:**
Open browser: http://localhost:3001

# Should see Next.js welcome page

---

## Step 10: Commit Your Setup

```bash
git add .
git commit -m "feat: initial project setup (Ticket 1.1 + 1.2 + 1.4)

- Initialize Turborepo monorepo structure
- Set up NestJS backend (apps/api)
- Set up Next.js frontend (apps/web)
- Create shared packages (types, utils)
- Configure Docker Compose (PostgreSQL, Redis, RabbitMQ, MinIO)
- Set up Prisma with initial schema (Tenant, User, Workflow)
- Configure ESLint + Prettier
- All services healthy and running

Completed tickets:
- [x] 1.1: Initialize Project Structure
- [x] 1.2: Set Up Development Environment
- [x] 1.4: Set Up Database with Prisma

Next: Ticket 1.3 (CI/CD Pipeline)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push -u origin feature/phase1-project-setup
```

---

## What You've Accomplished

✅ Turborepo monorepo with NestJS + Next.js  
✅ PostgreSQL, Redis, RabbitMQ, MinIO running in Docker  
✅ Prisma ORM with initial schema  
✅ Shared packages for types and utils  
✅ ESLint + Prettier configured  
✅ Development environment ready

---

## Next Steps (Ticket 1.3)

Create `.github/workflows/ci.yml` for CI/CD pipeline.

See: `docs/PHASE1_IMPLEMENTATION_TICKETS.md` → Ticket 1.3

---

**Need help with any step? Let me know!**
