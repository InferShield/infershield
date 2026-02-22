# Domain Setup for InferShield

## Current State
- **Railway URL**: https://infershield-production.up.railway.app/
- **Desired Domain**: https://infershield.io

## Issue
Users should access the dashboard and signup at:
- https://infershield.io/
- https://infershield.io/signup
- https://infershield.io/dashboard

But currently they need to use the Railway URL.

## Solution: Custom Domain on Railway

### Step 1: Railway Dashboard
1. Go to https://railway.app/
2. Open the `infershield-production` project
3. Click on the service (backend)
4. Go to **Settings** → **Networking**
5. Under **Custom Domains**, click **+ Add Domain**
6. Enter: `infershield.io`
7. Railway will show you DNS records to add

### Step 2: DNS Configuration

Railway will provide these records (example):

**A Record:**
```
Type: A
Name: @
Value: [Railway IP address]
TTL: 3600
```

**CNAME Record (for www):**
```
Type: CNAME  
Name: www
Value: infershield-production.up.railway.app
TTL: 3600
```

### Step 3: Add DNS Records to Your DNS Provider

1. Log in to your DNS provider (where infershield.io is registered)
2. Go to DNS settings
3. Add the A and CNAME records provided by Railway
4. Wait for DNS propagation (5-30 minutes)

### Step 4: Verify

```bash
# Check DNS propagation
dig infershield.io
dig www.infershield.io

# Test the domain
curl https://infershield.io/health
```

### Step 5: Update Extension

Once the domain is live, update the extension's default API endpoint:

**File:** `extension/background.js`

```javascript
const DEFAULT_CONFIG = {
  apiEndpoint: 'https://infershield.io', // Changed from localhost
  // ...
};
```

## Alternative: Subdomain Approach

If you want to keep the main site separate:

- **Frontend/Landing**: `infershield.io` (GitHub Pages)
- **API/Backend**: `api.infershield.io` (Railway)
- **Dashboard**: `app.infershield.io` or `dashboard.infershield.io` (Railway)

This requires:
1. Railway custom domain: `api.infershield.io`
2. DNS CNAME: `api.infershield.io → infershield-production.up.railway.app`
3. Extension config: `apiEndpoint: 'https://api.infershield.io'`

## Current Architecture

```
┌─────────────────────────────────────┐
│  infershield.io (GitHub Pages)      │  ← Landing page
│  - Static HTML/CSS/JS                │
│  - Marketing content                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  infershield-production.up.railway  │  ← Backend + Dashboard
│  - Node.js Express server            │
│  - PostgreSQL database               │
│  - /api/* endpoints                  │
│  - /dashboard.html                   │
│  - /signup.html                      │
└─────────────────────────────────────┘
```

## Recommended Architecture

```
┌─────────────────────────────────────┐
│  infershield.io (GitHub Pages)      │  ← Landing page only
│  - Static marketing site             │
│  - Links to app.infershield.io       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  app.infershield.io (Railway)       │  ← Full app
│  - /                → dashboard       │
│  - /signup          → signup page    │
│  - /login           → login page     │
│  - /api/analyze     → scan endpoint  │
│  - /api/auth/*      → auth routes    │
│  - /api/usage/*     → usage stats    │
└─────────────────────────────────────┘
```

## Action Items

**Immediate (for Alex):**
1. [ ] Add custom domain `infershield.io` (or `app.infershield.io`) in Railway
2. [ ] Get DNS records from Railway
3. [ ] Add DNS records to DNS provider
4. [ ] Wait for propagation (~30 min)
5. [ ] Test: `curl https://infershield.io/health`
6. [ ] Update extension config to use new domain

**Optional (later):**
- [ ] Set up SSL certificate (Railway handles this automatically)
- [ ] Configure CORS to allow infershield.io domain
- [ ] Update documentation with final domain
- [ ] Update GitHub repo description/website

## DNS Providers

Common providers and where to find DNS settings:

- **Namecheap**: Dashboard → Domain List → Manage → Advanced DNS
- **GoDaddy**: My Products → Domains → DNS
- **Cloudflare**: Dashboard → Select Domain → DNS
- **Google Domains**: My Domains → Manage → DNS
- **Route53 (AWS)**: Hosted zones → Select domain → Create record

## Troubleshooting

**DNS not propagating:**
```bash
# Force refresh DNS cache
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns             # Windows
```

**Certificate errors:**
- Railway auto-provisions SSL via Let's Encrypt
- Can take 5-10 minutes after DNS propagates
- Check Railway logs for certificate provisioning status

**Still hitting Railway URL:**
- Clear browser cache
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Try incognito/private browsing
