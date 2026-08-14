-- Migration: Add CredentialVault and AuditLog tables
-- Created: 2026-08-14
-- Run with: psql -U usamko -d usamko_dev -f prisma/migrations/add_credential_vault_and_audit_log.sql

-- Create CredentialVault table
CREATE TABLE IF NOT EXISTS "CredentialVault" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CredentialVault_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "CredentialVault_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "tenantId_userId_key"
    UNIQUE ("tenantId", "userId", "key")
);

-- Create indexes for CredentialVault
CREATE INDEX IF NOT EXISTS "CredentialVault_tenantId_idx" ON "CredentialVault"("tenantId");
CREATE INDEX IF NOT EXISTS "CredentialVault_userId_idx" ON "CredentialVault"("userId");

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "changes" JSONB,
  "error" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "duration" INTEGER,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for AuditLog
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- Add comments for documentation
COMMENT ON TABLE "CredentialVault" IS 'Encrypted storage for sensitive credentials (API keys, tokens, passwords)';
COMMENT ON TABLE "AuditLog" IS 'Audit trail for all mutations (security and compliance)';
COMMENT ON COLUMN "CredentialVault"."value" IS 'Encrypted JSON: {ciphertext, iv, authTag}';
COMMENT ON COLUMN "CredentialVault"."metadata" IS 'NOT encrypted - use for non-sensitive data only';
COMMENT ON COLUMN "AuditLog"."changes" IS 'Sanitized request data (sensitive fields redacted)';
