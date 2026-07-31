#!/bin/bash
set -e

echo "Initializing database..."

# Create initial tenant
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOF
-- Create initial tenant
INSERT INTO tenants (id, name, slug, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Tenant',
  'default',
  'ACTIVE'
)
ON CONFLICT (slug) DO NOTHING;

-- Create initial admin user
INSERT INTO users (id, email, name, role, "tenantId")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@usamko.com',
  'Admin User',
  'ADMIN',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT ("tenantId", email) DO NOTHING;

echo "Database initialized successfully!"
EOF