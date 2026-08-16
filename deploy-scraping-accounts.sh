#!/bin/bash

# Deployment Script for Scraping Accounts System
# Run this on your production server

set -e  # Exit on error

echo "🚀 Deploying Scraping Accounts System"
echo "======================================"

# Step 1: Check directory
echo "📁 Checking directory..."
if [ ! -d "/var/www/USAMKO" ]; then
  echo "❌ Error: /var/www/USAMKO not found!"
  exit 1
fi

cd /var/www/USAMKO

# Step 2: Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main

# Step 3: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Step 4: Check for encryption key
echo ""
echo "🔐 Checking encryption key..."
if ! grep -q "ENCRYPTION_KEY" .env 2>/dev/null; then
  echo "⚠️  ENCRYPTION_KEY not found in .env"
  echo "Generating encryption key..."
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
  echo "✅ Encryption key generated and added to .env"
else
  echo "✅ Encryption key found in .env"
fi

# Step 5: Run database migration
echo ""
echo "🗄️  Running database migration..."
npx prisma migrate dev --name add_scraping_accounts --skip-generate || {
  echo "⚠️  Migration may already exist, continuing..."
}

echo ""
echo "📊 Generating Prisma client..."
npx prisma generate

# Step 6: Build applications
echo ""
echo "🏗️  Building applications..."
npm run build

# Step 7: Restart services
echo ""
echo "🔄 Restarting services..."
pm2 restart usamko-api
pm2 restart usamko-web

# Step 8: Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Step 9: Check service status
echo ""
echo "✅ Checking service status..."
pm2 status

# Step 10: Check logs for errors
echo ""
echo "📋 Checking logs for errors..."
echo "API Logs:"
pm2 logs usamko-api --lines 20 --nostream | tail -10

echo ""
echo "Web Logs:"
pm2 logs usamko-web --lines 20 --nostream | tail -10

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo ""
echo "📖 Next Steps:"
echo "   1. Go to https://usamko.usamif.com/settings/scraping-accounts"
echo "   2. Add your LinkedIn account"
echo "   3. Test the connection"
echo "   4. Try lead collection"
echo ""
echo "📚 Read the full guide: SCRAPING_ACCOUNTS_GUIDE.md"
echo "======================================"
