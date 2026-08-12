# USAMKO v2.0 - Development Setup Complete! 🎉

## ✅ What's Been Created

Your project structure is ready:

```
m:\USAMKO\
├── apps/                      # (Ready for NestJS & Next.js)
├── packages/
│   ├── types/                 # ✅ Shared TypeScript types
│   └── utils/                 # ✅ Shared utility functions
├── docs/                      # ✅ All specifications
├── .env                       # ✅ Environment variables
├── .env.example               # ✅ Environment template
├── docker-compose.yml         # ✅ PostgreSQL, Redis, RabbitMQ, MinIO
├── package.json               # ✅ Root package with Turbo
├── pnpm-workspace.yaml        # ✅ Monorepo config
├── turbo.json                 # ✅ Turborepo pipeline
├── .prettierrc                # ✅ Code formatting
└── .eslintrc.js               # ✅ Linting rules
```

---

## 🚀 Next Steps (5 Minutes to Complete Setup)

### Step 1: Install Dependencies

```bash
cd m:\USAMKO

# Install pnpm globally (if not installed)
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Step 2: Start Docker Services

```bash
# Start PostgreSQL, Redis, RabbitMQ, MinIO
docker-compose up -d

# Check all services are healthy
docker-compose ps
```

**You should see:**

- ✅ usamko-postgres (healthy)
- ✅ usamko-redis (healthy)
- ✅ usamko-rabbitmq (healthy)
- ✅ usamko-minio (healthy)

**Access UIs:**

- RabbitMQ Management: http://localhost:15672 (user: `usamko`, pass: `dev_password_change_in_production`)
- MinIO Console: http://localhost:9001 (user: `usamko`, pass: `dev_password_change_in_production`)

### Step 3: Create NestJS Backend

```bash
cd m:\USAMKO\apps

# Create NestJS app
pnpm dlx @nestjs/cli new api

# When prompted:
# - Package manager: pnpm
# - Which language: TypeScript
```

**Then install dependencies:**

```bash
cd api

pnpm add @nestjs/config @nestjs/typeorm @prisma/client
pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt
pnpm add bcrypt argon2 class-validator class-transformer
pnpm add @microsoft/playwright
pnpm add -D prisma @types/bcrypt @types/passport-jwt

# Initialize Prisma
pnpm prisma init
```

### Step 4: Create Next.js Frontend

```bash
cd m:\USAMKO\apps

# Create Next.js app
pnpm dlx create-next-app@latest web

# When prompted:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - src/ directory: Yes
# - App Router: Yes
# - Import alias: No (default @/*)
```

**Then install dependencies:**

```bash
cd web

pnpm add zustand @tanstack/react-query
pnpm add react-hook-form zod @hookform/resolvers
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add axios
```

### Step 5: Set Up Prisma Schema

```bash
cd m:\USAMKO\apps\api
```

**Edit `prisma/schema.prisma`** and replace with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  workflows Workflow[]

  @@map("tenants")
}

model User {
  id        String   @id @default(uuid())
  email     String
  password  String
  name      String
  role      String   @default("user")
  tenantId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  workflows Workflow[]

  @@unique([tenantId, email])
  @@map("users")
}

model Workflow {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  name        String
  description String?
  status      String   @default("draft")
  definition  Json
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant     Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  executions WorkflowExecution[]

  @@map("workflows")
}

model WorkflowExecution {
  id          String    @id @default(uuid())
  workflowId  String
  status      String    @default("running")
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime  @default(now())
  completedAt DateTime?

  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@map("workflow_executions")
}
```

**Run migration:**

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### Step 6: Test Everything Works

```bash
cd m:\USAMKO

# Start all dev servers
pnpm dev
```

**Expected output:**

- API running on http://localhost:3000
- Web running on http://localhost:3001

**Test backend:**

```bash
curl http://localhost:3000
# Should return "Hello World!" or similar
```

**Test frontend:**
Open browser: http://localhost:3001

# Should see Next.js welcome page

---

## 🎯 Current Status

**Completed:**

- ✅ Monorepo structure (Turborepo)
- ✅ Shared packages (types, utils)
- ✅ Docker services (PostgreSQL, Redis, RabbitMQ, MinIO)
- ✅ Environment configuration
- ✅ Code quality tools (ESLint, Prettier)

**Next (You need to run Steps 3-6 above):**

- ⏳ NestJS backend setup
- ⏳ Next.js frontend setup
- ⏳ Prisma database migration

**After that:**

- [ ] Implement authentication (Ticket 3.1)
- [ ] Create first API endpoints
- [ ] Build login/register UI

---

## 📚 Documentation

All documentation is in `docs/`:

- `MASTER_SPECIFICATION_PART1.md` - Architecture & Design
- `MASTER_SPECIFICATION_PART2.md` - All 19 domains
- `PHASE1_IMPLEMENTATION_TICKETS.md` - All 41 tickets for Phase 1
- `GETTING_STARTED_DEVELOPMENT.md` - Full setup guide
- `AGGRESSIVE_FEATURES_SPECIFICATION.md` - All 200+ features

---

## 🆘 Troubleshooting

**Docker services not starting?**

```bash
# Check Docker Desktop is running
docker ps

# Restart services
docker-compose down
docker-compose up -d
```

**Port already in use?**

```bash
# Kill process on port 5432 (PostgreSQL)
netstat -ano | findstr :5432
taskkill /PID <PID> /F
```

**pnpm not found?**

```bash
npm install -g pnpm
```

---

## 🎉 You're Ready!

Once you complete Steps 3-6 above, you'll have:

- ✅ Full-stack TypeScript monorepo
- ✅ NestJS backend with Prisma ORM
- ✅ Next.js frontend with Tailwind CSS
- ✅ PostgreSQL database with migrations
- ✅ All supporting services running

**Then run:**

```bash
git add .
git commit -m "feat: complete project setup (Tickets 1.1, 1.2, 1.4)"
git push -u origin feature/phase1-project-setup
```

---

**Questions? Issues? Let me know!** 🚀
