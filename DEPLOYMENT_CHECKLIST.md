# 🚀 USAMKO DEPLOYMENT CHECKLIST

**Target:** AWS EC2 (44.205.4.211)  
**Status:** Phase 1 Complete, Ready for Deployment  
**Date:** 2026-08-14

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Phase 1: Security Foundation

- [x] EncryptionService implemented
- [x] CredentialVaultService implemented
- [x] AuditService implemented
- [x] AuditInterceptor implemented
- [x] Multi-tenant isolation (Prisma middleware)
- [x] Prisma models (CredentialVault + AuditLog)
- [x] Integration tests written
- [ ] Run database migrations
- [ ] Encrypt existing tokens
- [ ] All unit tests passing
- [ ] All integration tests passing

### Environment Configuration

- [ ] Generate encryption master key
- [ ] Create production .env file
- [ ] Set DATABASE_URL (production PostgreSQL)
- [ ] Set REDIS_URL (production Redis)
- [ ] Set JWT_SECRET (production secret)
- [ ] Set ENCRYPTION_MASTER_KEY
- [ ] Configure CORS origins
- [ ] Set API rate limits

### Database

- [ ] PostgreSQL installed on EC2
- [ ] Database created (usamko_prod)
- [ ] Database user created with proper permissions
- [ ] Database connection tested from EC2
- [ ] Run Prisma migrations
- [ ] Seed initial data (if needed)
- [ ] Database backups configured
- [ ] Connection pooling configured

### Dependencies

- [ ] Node.js 18+ installed on EC2
- [ ] pnpm/npm installed
- [ ] All npm packages installed
- [ ] Prisma Client generated
- [ ] Redis installed and running
- [ ] pm2 or systemd service configured

### Security

- [ ] SSL/TLS certificate configured
- [ ] Firewall rules configured (ports 80, 443, 3000)
- [ ] SSH key-based authentication
- [ ] Disable root login
- [ ] Encryption master key stored securely (AWS Secrets Manager)
- [ ] Database credentials secured
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Helmet security headers enabled

### Code

- [ ] All TypeScript compiles without errors
- [ ] No console.error or console.warn in production code
- [ ] Environment-specific config working
- [ ] Logging configured (production logs)
- [ ] Error handling complete

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Prepare EC2 Instance

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@44.205.4.211

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Install PM2 (process manager)
npm install -g pm2
```

### Step 2: Setup Database

```bash
# Create database user
sudo -u postgres psql
CREATE USER usamko WITH PASSWORD 'your-secure-password';
CREATE DATABASE usamko_prod OWNER usamko;
GRANT ALL PRIVILEGES ON DATABASE usamko_prod TO usamko;
\q

# Test connection
psql -h localhost -U usamko -d usamko_prod
```

### Step 3: Clone Repository

```bash
# Clone from GitHub
cd /var/www
sudo git clone https://github.com/mohamedsaber3108/USAMKO.git
cd USAMKO

# Checkout main branch
git checkout main

# Install dependencies
pnpm install
```

### Step 4: Configure Environment

```bash
# Create production environment file
nano .env.production

# Add:
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://usamko:password@localhost:5432/usamko_prod
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate-strong-secret>
REFRESH_TOKEN_SECRET=<generate-strong-secret>
ENCRYPTION_MASTER_KEY=<generate-64-hex-chars>
FRONTEND_URL=https://your-domain.com
```

### Step 5: Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Encrypt existing tokens (if any)
npx ts-node scripts/encrypt-existing-tokens.ts
```

### Step 6: Build Application

```bash
# Build TypeScript
pnpm run build

# Check build output
ls -la dist/apps/api/
```

### Step 7: Start with PM2

```bash
# Start application
pm2 start dist/apps/api/main.js --name usamko-api

# Configure PM2 startup
pm2 startup systemd
pm2 save

# Check status
pm2 status
pm2 logs usamko-api
```

### Step 8: Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/usamko

# Add:
server {
    listen 80;
    server_name 44.205.4.211;  # or your-domain.com

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/usamko /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Configure SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 10: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Health Checks

```bash
# Check API health
curl http://44.205.4.211/health
curl http://44.205.4.211/api/v1/health

# Check database connection
pm2 logs usamko-api | grep "Database connected"

# Check encryption service
pm2 logs usamko-api | grep "ENCRYPTION_MASTER_KEY"

# Check audit logging
pm2 logs usamko-api | grep "Audit logging enabled"
```

### Test Endpoints

```bash
# Test authentication
curl -X POST http://44.205.4.211/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test platforms
curl http://44.205.4.211/api/v1/platforms \
  -H "Authorization: Bearer <token>"

# Test campaigns
curl http://44.205.4.211/api/v1/campaigns \
  -H "Authorization: Bearer <token>"
```

### Monitor

```bash
# Check PM2 status
pm2 status
pm2 monit

# Check logs
pm2 logs usamko-api --lines 100

# Check system resources
htop
df -h
free -m

# Check database
psql -U usamko -d usamko_prod -c "SELECT COUNT(*) FROM \"User\";"
psql -U usamko -d usamko_prod -c "SELECT COUNT(*) FROM \"AuditLog\";"
psql -U usamko -d usamko_prod -c "SELECT COUNT(*) FROM \"CredentialVault\";"
```

### Backup

```bash
# Database backup
pg_dump -U usamko usamko_prod > backup-$(date +%Y%m%d).sql

# Configure automatic backups (cron)
crontab -e

# Add:
0 2 * * * pg_dump -U usamko usamko_prod > /backups/usamko-$(date +\%Y\%m\%d).sql
```

---

## 🔒 SECURITY POST-DEPLOYMENT

### Audit

- [ ] Audit logs working
- [ ] All mutations being logged
- [ ] Sensitive fields redacted
- [ ] IP addresses captured
- [ ] Error logging working

### Encryption

- [ ] All tokens encrypted in database
- [ ] Decryption working correctly
- [ ] No plain-text credentials visible
- [ ] Tenant isolation verified

### Access Control

- [ ] JWT authentication working
- [ ] Role-based access control (RBAC) working
- [ ] Multi-tenant isolation enforced
- [ ] Rate limiting active
- [ ] CORS properly configured

---

## 📊 MONITORING & ALERTS

### Setup Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Metrics to Monitor

- [ ] API response times
- [ ] Error rates
- [ ] Database connection pool usage
- [ ] Redis memory usage
- [ ] Disk space
- [ ] CPU and memory usage
- [ ] Audit log growth
- [ ] Failed login attempts

### Setup Alerts

- [ ] Disk space < 10% → Alert
- [ ] Error rate > 5% → Alert
- [ ] API down → Alert
- [ ] Database down → Alert
- [ ] Failed login attempts > 10/min → Alert

---

## 🎯 ROLLBACK PLAN

If deployment fails:

```bash
# Stop application
pm2 stop usamko-api

# Restore previous version
git checkout <previous-commit>
pnpm install
pnpm run build

# Restore database (if needed)
psql -U usamko -d usamko_prod < backup-YYYYMMDD.sql

# Restart
pm2 restart usamko-api
```

---

## ✅ FINAL CHECKLIST

### Application

- [ ] API responding on port 3000
- [ ] Health endpoint working
- [ ] Authentication working
- [ ] All endpoints accessible
- [ ] WebSocket connections working (if applicable)

### Database

- [ ] All migrations applied
- [ ] Indexes created
- [ ] Foreign keys enforced
- [ ] Connection pooling active
- [ ] Backups configured

### Security

- [ ] SSL certificate active
- [ ] HTTPS redirect working
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] All credentials encrypted

### Performance

- [ ] Response times < 200ms
- [ ] Database queries optimized
- [ ] Caching enabled
- [ ] gzip compression enabled
- [ ] Static assets served efficiently

### Documentation

- [ ] API documentation available
- [ ] Deployment documented
- [ ] Runbooks created
- [ ] Team trained

---

## 🚀 GO LIVE

When all checks pass:

```bash
# Final verification
curl https://your-domain.com/health

# Announce deployment
echo "USAMKO Platform is LIVE! 🎉"

# Monitor for first 24 hours
pm2 logs usamko-api --follow
```

---

## 📞 SUPPORT

**Issues:** https://github.com/mohamedsaber3108/USAMKO/issues  
**Logs:** `pm2 logs usamko-api`  
**Database:** `psql -U usamko -d usamko_prod`  
**Restart:** `pm2 restart usamko-api`

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Version:** Phase 1 (Security Foundation)  
**Status:** ✅ READY FOR PRODUCTION
