# Server Deployment Fix Guide

## Issue Diagnosis

From your server output, I can see:
1. ✅ PM2 is running: `usamko-api` and `usamko-web` are **ONLINE**
2. ❌ Code is NOT in `/var/www/usamko` 
3. ❌ You're trying to SSH to the same server from itself
4. ✅ API: 270.8mb memory, online
5. ✅ Web: 59.0mb memory, online

## Current Working State

Your app is **ALREADY RUNNING** successfully!
- API: Process ID 647837, running 83 minutes
- Web: Process ID 648334, running 68 minutes

## Find Where Code Is Located

```bash
# Find the actual code location
pm2 info usamko-api | grep cwd
pm2 info usamko-web | grep cwd

# Or check PM2 config
pm2 list
cat ~/.pm2/dump.pm2

# Or find by process
ps aux | grep node | grep usamko
```

## Deployment Steps (Correct Method)

### Step 1: Find Your Code Directory
```bash
# You're already ON the server, don't SSH again
cd ~
pm2 describe usamko-api

# Look for "cwd:" line - that's your code directory
# It's probably something like:
# /home/ubuntu/USAMKO
# or /home/ubuntu/usamko
# or /opt/usamko
```

### Step 2: Update Code (Once You Find Directory)
```bash
# Replace /path/to/code with actual path from Step 1
cd /path/to/code

# Pull latest changes
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Build frontend
npm run build:web

# Restart services
pm2 restart usamko-web
pm2 restart usamko-api
pm2 save
```

### Step 3: Deploy Scrapling Service (Optional)
```bash
# Install Python dependencies first
sudo apt update
sudo apt install -y python3-pip python3-venv

# Go to your code directory
cd /path/to/code/services/scrapling

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install scrapling[fetchers]

# Install browsers
scrapling install

# Start service with PM2
pm2 start "venv/bin/uvicorn scrapling_service:app --host 0.0.0.0 --port 8001" --name scrapling
pm2 save
```

## Quick Deploy Script

Save this as `deploy.sh` in your code directory:

\`\`\`bash
#!/bin/bash
set -e

echo "=== USAMKO Deployment Script ==="

# Get current directory
CODE_DIR=$(pm2 describe usamko-api 2>/dev/null | grep "cwd" | awk '{print $3}' || echo ".")

echo "Code directory: $CODE_DIR"
cd "$CODE_DIR"

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Install dependencies if needed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo "package.json changed, installing dependencies..."
    npm install
fi

# Build frontend
echo "Building frontend..."
npm run build:web

# Restart services
echo "Restarting services..."
pm2 restart usamko-web usamko-api
pm2 save

echo "✅ Deployment complete!"
pm2 status
\`\`\`

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

## Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs usamko-api --lines 50
pm2 logs usamko-web --lines 50

# Check if site is accessible
curl -I http://localhost:3000/health  # API
curl -I http://localhost:3001         # Web

# Check from outside
curl -I https://usamko.usamif.com
```

## Common Issues & Solutions

### Issue: "Not a git repository"
**Solution**: You're in the wrong directory. Find the correct one:
```bash
find ~ -name "package.json" -path "*/USAMKO/*" 2>/dev/null
```

### Issue: "PM2 process not found"
**Solution**: Process names are `usamko-api` and `usamko-web`, not `api` and `web`:
```bash
pm2 restart usamko-api usamko-web  # ✅ Correct
pm2 restart api web                # ❌ Wrong
```

### Issue: "Permission denied (publickey)"
**Solution**: You're already ON the server. Don't SSH to yourself:
```bash
# ❌ Wrong (you're already logged in)
ssh ubuntu@usamko.usamif.com

# ✅ Correct (just run commands directly)
cd /path/to/code
git pull
```

### Issue: Python/pip not found
**Solution**: Install Python tools:
```bash
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev
```

## Environment Variables

Check if .env file exists and has correct values:
```bash
cd /path/to/code
cat .env | grep -v PASSWORD | grep -v SECRET
```

Should have:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_REGION=us-east-1
SCRAPLING_SERVICE_URL=http://localhost:8001
FRONTEND_URL=https://usamko.usamif.com
API_URL=https://usamko.usamif.com/api
```

## Nginx Configuration

Verify Nginx is routing correctly:
```bash
sudo nginx -t
sudo systemctl status nginx
cat /etc/nginx/sites-enabled/usamko
```

Should have:
```nginx
location /api/ {
    proxy_pass http://localhost:3000/;
}

location / {
    proxy_pass http://localhost:3001;
}
```

## Quick Health Check

```bash
# One-liner to check everything
echo "API:" && curl -s http://localhost:3000/health | head -c 50 && \
echo -e "\nWeb:" && curl -s -I http://localhost:3001 | head -n 1 && \
echo "PM2:" && pm2 status | grep usamko && \
echo "Nginx:" && sudo nginx -t 2>&1 | grep successful
```

## Emergency Rollback

If deployment breaks something:
```bash
cd /path/to/code
git reset --hard HEAD~1  # Go back one commit
npm run build:web
pm2 restart all
```

## Get Help

If still stuck, run this diagnostic and share output:
```bash
cat << 'DIAGNOSTIC' > /tmp/diagnostic.sh
#!/bin/bash
echo "=== USAMKO Diagnostic Report ==="
echo "Date: $(date)"
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== PM2 usamko-api Info ==="
pm2 info usamko-api | grep -E "cwd|script|status|uptime|restarts"
echo ""
echo "=== PM2 usamko-web Info ==="
pm2 info usamko-web | grep -E "cwd|script|status|uptime|restarts"
echo ""
echo "=== Ports in Use ==="
ss -tlnp | grep -E "3000|3001|8001"
echo ""
echo "=== Recent Git Commits ==="
cd ~ && find . -name ".git" -type d 2>/dev/null | head -1 | xargs dirname | xargs -I {} sh -c 'cd {} && git log --oneline -5'
echo ""
echo "=== Disk Space ==="
df -h | grep -E "/$|Filesystem"
echo ""
echo "=== Memory ==="
free -h
DIAGNOSTIC

chmod +x /tmp/diagnostic.sh
/tmp/diagnostic.sh
```

---

## TL;DR - Quick Fix

```bash
# 1. Find code directory
pm2 describe usamko-api | grep cwd

# 2. Go there
cd <output_from_above>

# 3. Deploy
git pull
npm run build:web
pm2 restart usamko-api usamko-web
pm2 save

# 4. Verify
pm2 status
curl https://usamko.usamif.com
```

**Your apps are already running successfully!** Just find the correct directory and pull the latest code.
