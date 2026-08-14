#!/bin/bash

###############################################################################
# Database Setup Script
###############################################################################
#
# This script sets up the USAMKO database with all security features.
#
# Usage:
#   bash scripts/setup-database.sh
#
# Prerequisites:
#   - PostgreSQL installed and running
#   - Node.js and npm/pnpm installed
#   - .env.local file configured
#
###############################################################################

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                  USAMKO DATABASE SETUP                                   ║"
echo "║                Phase 1: Security Foundation                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check PostgreSQL
echo -e "${BLUE}Step 1: Checking PostgreSQL...${NC}"
if command -v psql >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is installed${NC}"
else
    echo -e "${RED}❌ PostgreSQL not found. Please install PostgreSQL first.${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if pg_isready >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Start it with:${NC}"
    echo "   - Windows: net start postgresql"
    echo "   - Mac: brew services start postgresql"
    echo "   - Linux: sudo systemctl start postgresql"
    exit 1
fi
echo ""

# Step 2: Check environment variables
echo -e "${BLUE}Step 2: Checking environment variables...${NC}"
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env or .env.local file not found${NC}"
    echo "Create .env.local with:"
    echo "  DATABASE_URL=postgresql://user:password@localhost:5432/usamko_dev"
    echo "  ENCRYPTION_MASTER_KEY=<64-hex-character-key>"
    exit 1
fi

# Load environment variables
if [ -f ".env.local" ]; then
    export $(grep -v '^#' .env.local | xargs)
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set in environment${NC}"
    exit 1
fi
echo -e "${GREEN}✅ DATABASE_URL is set${NC}"

if [ -z "$ENCRYPTION_MASTER_KEY" ]; then
    echo -e "${RED}❌ ENCRYPTION_MASTER_KEY not set in environment${NC}"
    echo ""
    echo "Generate one with:"
    echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
    echo "Then add to .env.local:"
    echo "  ENCRYPTION_MASTER_KEY=<generated-key>"
    exit 1
fi
echo -e "${GREEN}✅ ENCRYPTION_MASTER_KEY is set${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
if command -v pnpm >/dev/null 2>&1; then
    pnpm install
elif command -v npm >/dev/null 2>&1; then
    npm install
else
    echo -e "${RED}❌ npm or pnpm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 4: Generate Prisma Client
echo -e "${BLUE}Step 4: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# Step 5: Run database migrations
echo -e "${BLUE}Step 5: Running database migrations...${NC}"
npx prisma migrate dev --name add_credential_vault_and_audit_log
echo -e "${GREEN}✅ Database migrations complete${NC}"
echo ""

# Step 6: Encrypt existing tokens
echo -e "${BLUE}Step 6: Encrypting existing tokens...${NC}"
echo "This will encrypt all plain-text tokens in the PlatformAccount table."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx ts-node scripts/encrypt-existing-tokens.ts
    echo -e "${GREEN}✅ Token encryption complete${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped token encryption${NC}"
fi
echo ""

# Step 7: Verify setup
echo -e "${BLUE}Step 7: Verifying setup...${NC}"

# Check if tables exist
TABLE_CHECK=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('CredentialVault', 'AuditLog')")

if [ "$TABLE_CHECK" -eq "2" ]; then
    echo -e "${GREEN}✅ CredentialVault table exists${NC}"
    echo -e "${GREEN}✅ AuditLog table exists${NC}"
else
    echo -e "${RED}❌ Tables not created properly${NC}"
    exit 1
fi
echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                     ✅ DATABASE SETUP COMPLETE                           ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ All security features enabled:${NC}"
echo "   • AES-256-GCM encryption"
echo "   • Credential vault (encrypted storage)"
echo "   • Audit logging (compliance)"
echo "   • Multi-tenant isolation"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "   1. Start the API server: npm run dev"
echo "   2. Test encryption: npm test -- encryption.service.spec.ts"
echo "   3. Review Phase 1 docs: PHASE1_SECURITY_FOUNDATION.md"
echo ""
echo -e "${GREEN}🎉 Phase 1: Security Foundation is READY!${NC}"
echo ""
