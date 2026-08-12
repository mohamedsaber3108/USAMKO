#!/bin/bash
# USAMKO v2.0 - EC2 Deployment Script
# Server: Ubuntu 26.04, t3.medium, 44.205.4.211

set -e

echo "=== USAMKO v2.0 Deployment Script ==="

# 1. System Update
echo "[1/8] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@8

# 3. Install PostgreSQL 16
echo "[3/8] Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER usamko WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE usamko_prod OWNER usamko;
GRANT ALL PRIVILEGES ON DATABASE usamko_prod TO usamko;
EOF

# 4. Install Redis
echo "[4/8] Installing Redis..."
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# 5. Install Playwright dependencies
echo "[5/8] Installing Playwright deps..."
sudo npx playwright install-deps chromium

# 6. Clone and setup project
echo "[6/8] Setting up project..."
cd /opt
sudo mkdir -p usamko && sudo chown ubuntu:ubuntu usamko
cd usamko

# Clone your repo (update URL)
# git clone https://github.com/YOUR_USER/USAMKO.git .
# OR upload via scp

# Install dependencies
pnpm install --frozen-lockfile

# 7. Configure environment
echo "[7/8] Configuring environment..."
cat > .env <<'ENVEOF'
# Database
DATABASE_URL=postgresql://usamko:CHANGE_THIS_PASSWORD@localhost:5432/usamko_prod

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT - CHANGE THESE IN PRODUCTION!
JWT_SECRET=GENERATE_A_SECURE_64_CHAR_RANDOM_STRING_HERE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
API_PORT=3000
WEB_PORT=3001
API_URL=http://44.205.4.211:3000
WEB_URL=http://44.205.4.211:3001

# Playwright
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_SLOW_MO=0

# OpenAI (for AI content generation)
OPENAI_API_KEY=sk-your-openai-key

# MinIO (optional - for file storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=usamko-prod
ENVEOF

# 8. Build and deploy
echo "[8/8] Building and starting..."
npx prisma generate
npx prisma migrate deploy
pnpm build

# Install PM2 for process management
sudo npm install -g pm2

# Start services with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "API:      http://44.205.4.211:3000"
echo "Frontend: http://44.205.4.211:3001"
echo "Swagger:  http://44.205.4.211:3000/api/docs"
echo ""
echo "IMPORTANT: Update .env with real credentials!"
