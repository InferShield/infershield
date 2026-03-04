# 🔐 Railway Environment Variables Configuration Guide

**Status:** P0 BLOCKER REMEDIATION  
**Authorization:** CEO-DEPLOYMENT-FINAL-PROD-001-20260304-APPROVED  
**Deadline:** March 5, 2026 18:00 UTC  
**Owner:** DevOps Lead  
**Estimated Time:** 20 minutes  

---

## ✅ BLOCKER 2: Environment Variables Configuration

### Required Environment Variables

#### 1. Redis Configuration (CRITICAL - P0 BLOCKING)

**Option A: Railway Redis Addon (RECOMMENDED)**

**Steps:**
1. Railway Dashboard → InferShield project → "New" → "Database" → "Add Redis"
2. Railway will automatically provision Redis and set `REDIS_URL`
3. Verify `REDIS_URL` is set in Variables tab

**Expected Format:**
```bash
REDIS_URL=redis://default:<password>@<host>:<port>
```

**Additional Redis Variables:**
```bash
USE_REDIS_SESSIONS=true              # Enable Redis sessions
SESSION_TTL=3600                     # 1 hour session TTL
REDIS_TLS=false                      # Railway Redis uses internal network (no TLS needed)
REDIS_FALLBACK_MEMORY=false          # Do NOT fallback to in-memory (production)
```

**Validation Command:**
```bash
# Test Redis connectivity (run in Railway service shell)
redis-cli -u $REDIS_URL ping
# Expected output: PONG
```

---

**Option B: External Redis (Upstash, Redis Cloud, etc.)**

If using external Redis provider:
```bash
REDIS_URL=rediss://<username>:<password>@<host>:<port>  # Note: rediss:// for TLS
USE_REDIS_SESSIONS=true
SESSION_TTL=3600
REDIS_TLS=true                       # External providers typically use TLS
REDIS_FALLBACK_MEMORY=false
```

---

#### 2. Stripe Configuration (CRITICAL - P0 BLOCKING)

**Required Variables:**
```bash
# Stripe API Keys (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_51T0WD56CAMERXE4U...        # Full live key required
STRIPE_PUBLISHABLE_KEY=pk_live_51T0WD56CAMERXE4U...  # Full live key required

# Stripe Price IDs (already confirmed in RAILWAY_DEPLOY.md)
STRIPE_PRICE_PRO=price_1T3Q0g6CAMERXE4U7dmCIKZI
STRIPE_PRICE_ENTERPRISE=price_1T3Q0h6CAMERXE4USLElvr47

# Frontend URL (for Stripe redirects)
FRONTEND_URL=https://app.infershield.io
```

**⚠️ SECURITY WARNING:**
- Use **LIVE** keys for production (sk_live_*, pk_live_*)
- Do NOT use test keys (sk_test_*, pk_test_*) in production
- Stripe keys are sensitive - do NOT commit to Git or share publicly

**Validation Command:**
```bash
# Test Stripe API connectivity (run locally or in Railway shell)
curl https://api.stripe.com/v1/prices/price_1T3Q0g6CAMERXE4U7dmCIKZI \
  -u $STRIPE_SECRET_KEY:
# Expected: JSON response with price details
```

---

#### 3. Existing Environment Variables (VERIFY)

**Core Infrastructure:**
```bash
# Database (should already be set by Railway PostgreSQL addon)
DATABASE_URL=postgresql://...         # Auto-provisioned by Railway

# Authentication
JWT_SECRET=<32+ character secret>    # Should already be set (verify length)

# Server Configuration
PORT=5000                             # Railway auto-sets (usually 5000 or $PORT)
NODE_ENV=production                   # CRITICAL: Must be "production" for Railway
```

**Verification Checklist:**
- [ ] `DATABASE_URL` exists and starts with `postgresql://`
- [ ] `JWT_SECRET` exists and is at least 32 characters
- [ ] `NODE_ENV` is set to `production` (NOT `development` or `test`)
- [ ] `PORT` is set (Railway auto-injects `$PORT` variable)

---

## 🚀 Deployment Steps

### Step 1: Access Railway Dashboard

1. Navigate to: https://railway.app/
2. Select **InferShield** project
3. Click on **backend** service (or main service)
4. Click **Variables** tab

---

### Step 2: Provision Railway Redis Addon

1. Click **"New"** → **"Database"** → **"Add Redis"**
2. Wait for provisioning (30-60 seconds)
3. Verify `REDIS_URL` appears in Variables tab automatically

**Expected Output:**
```
✅ Redis provisioned
✅ REDIS_URL = redis://default:****@redis-abc123.railway.internal:6379
```

---

### Step 3: Add Redis Session Variables

Click **"New Variable"** and add each:

```bash
Variable Name: USE_REDIS_SESSIONS
Value: true

Variable Name: SESSION_TTL
Value: 3600

Variable Name: REDIS_TLS
Value: false

Variable Name: REDIS_FALLBACK_MEMORY
Value: false
```

---

### Step 4: Add Stripe Variables

Click **"New Variable"** and add each:

```bash
Variable Name: STRIPE_SECRET_KEY
Value: sk_live_51T0WD56CAMERXE4U... (paste full key)

Variable Name: STRIPE_PUBLISHABLE_KEY
Value: pk_live_51T0WD56CAMERXE4U... (paste full key)

Variable Name: STRIPE_PRICE_PRO
Value: price_1T3Q0g6CAMERXE4U7dmCIKZI

Variable Name: STRIPE_PRICE_ENTERPRISE
Value: price_1T3Q0h6CAMERXE4USLElvr47

Variable Name: FRONTEND_URL
Value: https://app.infershield.io
```

---

### Step 5: Verify All Variables Set

**Required Variables Checklist:**
- [ ] `DATABASE_URL` (auto-provisioned by Railway PostgreSQL)
- [ ] `JWT_SECRET` (should exist, verify >= 32 chars)
- [ ] `NODE_ENV=production`
- [ ] `PORT` (Railway auto-injects)
- [ ] `REDIS_URL` (auto-provisioned by Railway Redis addon)
- [ ] `USE_REDIS_SESSIONS=true`
- [ ] `SESSION_TTL=3600`
- [ ] `REDIS_TLS=false`
- [ ] `REDIS_FALLBACK_MEMORY=false`
- [ ] `STRIPE_SECRET_KEY` (starts with `sk_live_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`)
- [ ] `STRIPE_PRICE_PRO`
- [ ] `STRIPE_PRICE_ENTERPRISE`
- [ ] `FRONTEND_URL`

**Total Variables:** 14

---

### Step 6: Trigger Railway Redeploy

1. Click **"Deploy"** button (Railway will auto-deploy after variables saved)
2. Monitor deployment logs for errors
3. Wait for deployment to complete (~2-3 minutes)

**Expected Deployment Output:**
```
🚀 Starting InferShield server...
🔧 NODE_ENV: production
🗄️ DATABASE_URL: Set ✓
🔑 JWT_SECRET: Set ✓
🔴 Redis connection: Attempting...
✅ Redis connection: Connected to redis-abc123.railway.internal:6379
✅ Stripe API: Keys validated
```

---

## ✅ Validation & Testing

### Test 1: Health Check

```bash
curl https://infershield-backend.railway.app/health
# Expected: {"status":"ok"}
```

### Test 2: Redis Connection

```bash
# Railway service shell:
redis-cli -u $REDIS_URL ping
# Expected: PONG

# Backend logs should show:
# ✅ Redis connection: Connected to <host>:<port>
```

### Test 3: Stripe API Validation

```bash
# Test Stripe API key validity
curl https://api.stripe.com/v1/prices/$STRIPE_PRICE_PRO \
  -u $STRIPE_SECRET_KEY:
# Expected: JSON response with price details (no error)
```

### Test 4: Create Test Session (End-to-End)

```bash
# Create session via API (should persist in Redis)
curl -X POST https://infershield-backend.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-$(date +%s)" \
  -d '{
    "prompt": "Test session persistence",
    "agent_id": "devops-validation"
  }'

# Expected: 
# {"success":true,"threat_detected":false,"risk_score":0,...}

# Verify session exists in Redis (Railway service shell):
redis-cli -u $REDIS_URL KEYS "session:*"
# Expected: List of session keys including test session
```

### Test 5: Stripe Payment Flow (Staging)

```bash
# Visit pricing page
open https://app.infershield.io/pricing.html

# Click "Upgrade to Pro"
# Expected: Redirect to Stripe Checkout with live mode (NOT test mode)
# URL should contain: checkout.stripe.com

# Test with Stripe test card (in test mode):
# Card: 4242 4242 4242 4242
# Expiry: Any future date
# CVC: Any 3 digits
# ZIP: Any 5 digits

# Expected: Payment succeeds, redirects back to InferShield
```

---

## 🚨 Troubleshooting

### Issue 1: Redis Connection Failed

**Symptoms:**
```
❌ Redis connection: Error connecting to Redis
Error: getaddrinfo ENOTFOUND redis-abc123.railway.internal
```

**Solution:**
1. Verify Railway Redis addon is provisioned (Dashboard → Databases)
2. Verify `REDIS_URL` is set in Variables tab
3. Verify Railway internal network is enabled (should be automatic)
4. Restart backend service (Railway → Service → Settings → Restart)

---

### Issue 2: Stripe API Error 401 Unauthorized

**Symptoms:**
```
❌ Stripe API: Unauthorized (401)
Error: Invalid API Key provided
```

**Solution:**
1. Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (NOT `sk_test_`)
2. Verify no extra spaces or quotes in environment variable
3. Regenerate API key in Stripe Dashboard if compromised
4. Restart backend service after updating variable

---

### Issue 3: Stripe Checkout Not Redirecting

**Symptoms:**
- Clicking "Upgrade to Pro" does nothing
- Browser console shows CORS error

**Solution:**
1. Verify `FRONTEND_URL` is set to `https://app.infershield.io` (NO trailing slash)
2. Verify Stripe Price IDs are correct (check Stripe Dashboard → Products)
3. Verify frontend is served over HTTPS (Stripe requires HTTPS for live mode)
4. Check browser console for JavaScript errors

---

### Issue 4: Sessions Not Persisting

**Symptoms:**
- User logs out after backend restart
- Session lost after switching instances

**Solution:**
1. Verify `USE_REDIS_SESSIONS=true` (NOT `false`)
2. Verify `REDIS_FALLBACK_MEMORY=false` (do NOT fallback to in-memory)
3. Verify Redis connection is successful (check logs)
4. Verify session TTL is not too short (should be 3600 seconds = 1 hour)
5. Check Redis storage (Railway dashboard → Redis → Metrics)

---

## 📋 Acceptance Criteria Checklist

### BLOCKER 2: Environment Variables Configuration

**Redis Configuration:**
- [ ] Railway Redis addon provisioned
- [ ] `REDIS_URL` environment variable set (auto-provisioned)
- [ ] `USE_REDIS_SESSIONS=true` set
- [ ] `SESSION_TTL=3600` set
- [ ] `REDIS_TLS=false` set (or `true` if external Redis)
- [ ] `REDIS_FALLBACK_MEMORY=false` set
- [ ] Redis connectivity validated (ping successful)
- [ ] Test session created and persisted

**Stripe Configuration:**
- [ ] `STRIPE_SECRET_KEY` set (sk_live_*)
- [ ] `STRIPE_PUBLISHABLE_KEY` set (pk_live_*)
- [ ] `STRIPE_PRICE_PRO` set
- [ ] `STRIPE_PRICE_ENTERPRISE` set
- [ ] `FRONTEND_URL` set
- [ ] Stripe API connectivity validated (curl test successful)
- [ ] Stripe Checkout redirect working (live mode)

**Core Infrastructure:**
- [ ] `DATABASE_URL` verified (PostgreSQL)
- [ ] `JWT_SECRET` verified (>= 32 chars)
- [ ] `NODE_ENV=production` verified
- [ ] `PORT` verified (Railway auto-injected)

**Deployment:**
- [ ] All variables set in Railway dashboard
- [ ] Backend redeployed with new variables
- [ ] Deployment logs show no errors
- [ ] Health check endpoint responding
- [ ] DevOps Lead validation: "All environment variables configured and tested"

**Current Status:** 0% COMPLETE (pending Railway dashboard access)

---

## ⏱️ Time Estimate

| Task | Duration |
|------|----------|
| Access Railway dashboard | 1 min |
| Provision Railway Redis addon | 2 min |
| Add Redis environment variables | 3 min |
| Add Stripe environment variables | 5 min |
| Verify all variables set | 2 min |
| Trigger redeploy | 1 min |
| Wait for deployment | 3 min |
| Run validation tests | 3 min |
| **Total** | **20 minutes** |

---

## 🎯 Next Steps

1. ✅ Backend instrumentation complete (BLOCKER 1 - partial)
2. ⏳ Access Railway dashboard (BLOCKER 2 - Step 1)
3. ⏳ Provision Redis addon (BLOCKER 2 - Step 2)
4. ⏳ Configure environment variables (BLOCKER 2 - Steps 3-4)
5. ⏳ Validate configuration (BLOCKER 2 - Step 6)
6. ✅ Update DevOps Readiness Report (BLOCKER 2 RESOLVED)

---

**Report Author:** DevOps Lead (Subagent)  
**Date:** 2026-03-04 19:55 UTC  
**Session:** agent:main:subagent:9bab383c-ba43-48f9-ab63-b3e3b1376532  
**Status:** Ready for Railway dashboard access
