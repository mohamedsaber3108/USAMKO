# 🚀 USAMKO - COMPLETE SETUP GUIDE

**ALL FEATURES IMPLEMENTED - PRODUCTION READY**

This guide will walk you through setting up the complete USAMKO platform with ALL features enabled.

---

## ✅ WHAT'S INCLUDED

### Security Foundation ✅
- AES-256-GCM encryption
- Secure credential vault
- Complete audit logging
- Multi-tenant isolation
- JWT authentication

### Chrome Extension ✅
- Manifest V3 structure
- Background service worker
- Token capture for 6 platforms
- Real-time WebSocket connection
- Beautiful popup UI

### Platform Adapters ✅ (ALL 11 PLATFORMS)
1. ✅ Facebook
2. ✅ Instagram
3. ✅ LinkedIn
4. ✅ Twitter/X
5. ✅ WhatsApp
6. ✅ Telegram
7. ✅ YouTube
8. ✅ Pinterest
9. ✅ Reddit
10. ✅ VK (VKontakte)
11. ✅ ASK.fm

---

## 📋 PREREQUISITES

### Required Software
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- Redis 6+ ([Download](https://redis.io/download))
- Git ([Download](https://git-scm.com/downloads))
- Chrome Browser ([Download](https://www.google.com/chrome/))

### Optional
- PM2 for process management: `npm install -g pm2`
- Postman for API testing ([Download](https://www.postman.com/downloads/))

---

## 🚀 STEP-BY-STEP SETUP

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project
cd m:\USAMKO

# Install all dependencies
npm install

# Install WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Install platform-specific packages
npm install axios cheerio

# Generate Prisma Client
npx prisma generate
```

### Step 2: Configure Environment

```bash
# Generate encryption master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy result and create .env.local
# Example output: a1b2c3d4...
```

Create `.env.local` file:

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://usamko:your_password@localhost:5432/usamko_dev?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption (REQUIRED) - Use the key generated above
ENCRYPTION_MASTER_KEY=a1b2c3d4e5f6...your-64-character-hex-key

# Frontend
FRONTEND_URL=http://localhost:3001

# MinIO/S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# API Keys (Optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
HUNTER_IO_API_KEY=your-hunter-io-api-key
```

### Step 3: Setup Database

```bash
# Start PostgreSQL service
# Windows: net start postgresql-x64-15
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE usamko_dev;
CREATE USER usamko WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE usamko_dev TO usamko;
\q

# Run migrations
npx prisma migrate dev --name init_all_features

# If migrations fail, apply SQL manually:
psql -U usamko -d usamko_dev -f prisma/migrations/add_credential_vault_and_audit_log.sql
```

### Step 4: Encrypt Existing Tokens (If Any)

```bash
# Run token encryption migration
npx ts-node scripts/encrypt-existing-tokens.ts
```

### Step 5: Start Redis

```bash
# Windows: redis-server
# Mac: brew services start redis
# Linux: sudo systemctl start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 6: Start the API

```bash
# Development mode
npm run dev

# Or production mode
npm run build
npm run start:prod

# Or with PM2
pm2 start dist/apps/api/main.js --name usamko-api
```

### Step 7: Verify API is Running

```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return: {"status":"ok"}
```

---

## 🌐 CHROME EXTENSION SETUP

### Step 1: Load Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select folder: `m:\USAMKO\chrome-extension`
5. Extension will appear in your extensions list ✅

### Step 2: Configure JWT Token

1. Log in to USAMKO dashboard at `http://localhost:3001`
2. Go to **Settings** → **API Access**
3. Copy your JWT token
4. Click USAMKO extension icon in Chrome toolbar
5. Click **"Configure"**
6. Paste JWT token
7. Click **"Save"**
8. Extension will automatically connect ✅

### Step 3: Test Token Capture

1. Navigate to Facebook.com and log in
2. Extension will automatically detect and capture token
3. Check extension popup - you should see "Connected" status
4. Check USAMKO dashboard - Facebook account should appear

---

## 🧪 TESTING

### Test Encryption

```bash
npm test -- encryption.service.spec.ts
```

### Test WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect (replace <jwt-token> with your token)
wscat -c "ws://localhost:3000/token-capture?token=<jwt-token>"

# Send test message
{"event":"ping","data":{}}

# Should receive: {"event":"pong","data":{"pong":1234567890}}
```

### Test Platform Adapters

```bash
# Test Telegram
curl -X POST http://localhost:3000/api/platforms/telegram/test \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from USAMKO!"}'

# Test YouTube
curl -X POST http://localhost:3000/api/platforms/youtube/test \
  -H "Authorization: Bearer <jwt-token>"

# Test all platforms
npm run test:platforms
```

---

## 📊 VERIFY EVERYTHING WORKS

### Checklist

- [ ] PostgreSQL running (`psql -U usamko -d usamko_dev -c "SELECT 1;"`)
- [ ] Redis running (`redis-cli ping`)
- [ ] API running (`curl http://localhost:3000/health`)
- [ ] Encryption key configured (check `.env.local`)
- [ ] Database migrations applied (`npx prisma migrate status`)
- [ ] Chrome Extension loaded (`chrome://extensions/`)
- [ ] Extension connected (check popup)
- [ ] Token capture working (test on Facebook)

### Database Verification

```bash
# Connect to database
psql -U usamko -d usamko_dev

# Check tables exist
\dt

# Should see:
# CredentialVault
# AuditLog
# User
# Tenant
# PlatformAccount
# Campaign
# Workflow
# ... etc

# Check CredentialVault model
\d "CredentialVault"

# Check AuditLog model  
\d "AuditLog"

# Exit
\q
```

---

## 🎯 PLATFORM-SPECIFIC SETUP

### Telegram

```bash
# Get bot token from @BotFather
# 1. Open Telegram
# 2. Search for @BotFather
# 3. Send /newbot
# 4. Follow instructions
# 5. Copy bot token
# 6. Add to USAMKO platform accounts
```

### YouTube

```bash
# Get API credentials
# 1. Go to https://console.cloud.google.com
# 2. Create new project
# 3. Enable YouTube Data API v3
# 4. Create OAuth 2.0 credentials
# 5. Add to USAMKO
```

### Reddit

```bash
# Get API credentials
# 1. Go to https://www.reddit.com/prefs/apps
# 2. Click "create app"
# 3. Select "script" type
# 4. Copy client ID and secret
# 5. Add to USAMKO
```

### VK (VKontakte)

```bash
# Get access token
# 1. Go to https://vk.com/apps?act=manage
# 2. Create new standalone application
# 3. Get app ID and secret
# 4. Use OAuth to get access token
# 5. Add to USAMKO
```

---

## 🔒 SECURITY CHECKLIST

### Before Production

- [ ] Change all secrets in `.env.local`
- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Generate new ENCRYPTION_MASTER_KEY
- [ ] Enable HTTPS/WSS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review audit logs

### Environment Variables to Change

```bash
# NEVER use these in production:
JWT_SECRET=your-super-secret-jwt-key-change-in-production  # ❌ CHANGE
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key   # ❌ CHANGE
ENCRYPTION_MASTER_KEY=your_64_character_hex_key_here       # ❌ CHANGE

# Generate new ones:
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## 🚀 PRODUCTION DEPLOYMENT

### AWS EC2 Deployment

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@44.205.4.211

# Follow setup steps above
cd /var/www/USAMKO
npm install
npm run build

# Use PM2 for process management
pm2 start dist/apps/api/main.js --name usamko-api
pm2 startup
pm2 save

# Configure Nginx
sudo nano /etc/nginx/sites-available/usamko
# Add reverse proxy configuration

# Enable SSL
sudo certbot --nginx -d your-domain.com
```

### Docker Deployment

```bash
# Build Docker image
docker build -t usamko-api .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🐛 TROUBLESHOOTING

### API won't start

```bash
# Check node version
node --version  # Should be 18+

# Check dependencies
npm install

# Check database connection
psql -U usamko -d usamko_dev -c "SELECT 1;"

# Check Redis
redis-cli ping

# Check logs
npm run dev 2>&1 | tee api.log
```

### Extension not connecting

```bash
# Check WebSocket URL in service-worker.js
# Should be: ws://localhost:3000/token-capture

# Check JWT token is valid
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer <your-token>"

# Check extension console
# Right-click extension icon → Inspect popup → Console
```

### Tokens not being captured

```bash
# Check content script is loaded
# Open Facebook → F12 → Console
# Should see: "USAMKO: Facebook token capture initialized"

# Check background worker
# chrome://extensions/ → USAMKO → Service worker → Inspect
# Check for errors in console
```

### Database errors

```bash
# Reset database
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Check Prisma Client is generated
npx prisma generate
```

---

## 📚 DOCUMENTATION

All documentation available in `m:\USAMKO\`:

- **ARCHITECTURE.md** - Complete system architecture
- **IMPLEMENTATION_ROADMAP.md** - 42-week development plan
- **PHASE1_SECURITY_FOUNDATION.md** - Security guide
- **PHASE2_CHROME_EXTENSION.md** - Extension guide
- **DEPLOYMENT_CHECKLIST.md** - Production deployment
- **COMPLETE_IMPLEMENTATION_STATUS.md** - Current status
- **chrome-extension/README.md** - Extension documentation

---

## 🎉 YOU'RE DONE!

Everything should now be working:

✅ **API running** at `http://localhost:3000`  
✅ **WebSocket** at `ws://localhost:3000/token-capture`  
✅ **Chrome Extension** loaded and connected  
✅ **All 11 platforms** supported  
✅ **Security features** enabled  
✅ **Encryption** active  
✅ **Audit logging** working  

**Next steps:**
1. Add platform accounts through dashboard
2. Create campaigns
3. Test posting to all platforms
4. Monitor audit logs
5. Deploy to production

---

## 📞 SUPPORT

**Issues:** https://github.com/mohamedsaber3108/USAMKO/issues  
**Docs:** See `m:\USAMKO\` documentation files  
**Logs:** `pm2 logs usamko-api` or check console

---

**Version:** 1.0.0 (ALL FEATURES COMPLETE)  
**Last Updated:** 2026-08-14  
**Status:** ✅ PRODUCTION READY
