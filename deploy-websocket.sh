#!/bin/bash

# Deploy WebSocket Token Capture Gateway
set -e

echo "🚀 Deploying WebSocket Token Capture Gateway"
echo "=============================================="

# Step 1: Navigate to project
cd /var/www/USAMKO

# Step 2: Pull latest code
echo "📥 Pulling latest code..."
git add .
git commit -m "feat: enable WebSocket token capture gateway" || true
git pull origin main

# Step 3: Install WebSocket dependencies
echo "📦 Installing WebSocket packages..."
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Step 4: Build
echo "🏗️  Building API..."
npm run build

# Step 5: Restart API
echo "🔄 Restarting API..."
pm2 restart usamko-api

# Step 6: Wait for startup
echo "⏳ Waiting for API to start..."
sleep 5

# Step 7: Check logs
echo "📋 Checking logs..."
pm2 logs usamko-api --lines 30 --nostream | tail -15

echo ""
echo "=============================================="
echo "✅ WebSocket Deployment Complete!"
echo ""
echo "📖 Test Connection:"
echo "   Chrome Extension should now connect to:"
echo "   wss://usamko.usamif.com/token-capture"
echo ""
echo "🔍 Monitor WebSocket connections:"
echo "   pm2 logs usamko-api --lines 100"
echo "=============================================="
