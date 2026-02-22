# Railway Deployment Guide

## Quick Deploy (5 Minutes)

### 1. Create Railway Account
1. Go to: https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)
4. Authorize Railway

### 2. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: `InferShield/infershield`
4. Railway auto-detects Node.js

### 3. Add PostgreSQL
1. In project: Click "New" → "Database" → "Add PostgreSQL"
2. Railway creates database and sets `DATABASE_URL` automatically

### 4. Configure Root Directory
1. Click on your service
2. Go to "Settings"
3. Under "Build", set **Root Directory:** `backend`
4. Under "Deploy", set **Start Command:** `npm run migrate:prod && npm start`

### 5. Set Environment Variables
Go to "Variables" tab, add:

```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=infershield_prod_$(openssl rand -hex 32)
CORS_ORIGIN=*
```

**Optional (for Stripe):**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. Deploy
1. Click "Deploy"
2. Watch logs for migration success
3. Copy your URL: `https://infershield-production.up.railway.app`

### 7. Test
```bash
curl https://YOUR-URL.up.railway.app/health
```

Should return: `{"status":"ok"}`

## Troubleshooting

**"Module not found" error:**
- Check Root Directory is set to `backend`

**"Migration failed":**
- Verify DATABASE_URL is set (should be automatic from Postgres service)
- Check logs for specific error

**"Port already in use":**
- Railway sets PORT automatically - don't override in .env

**CORS errors:**
- Set CORS_ORIGIN to include your extension ID or use `*` for testing

## Custom Domain (Optional)

1. Go to "Settings" → "Domains"
2. Click "Generate Domain" (free Railway subdomain)
3. Or add custom domain with DNS setup

## Monitoring

Railway provides:
- Real-time logs
- CPU/Memory metrics
- Deployment history
- Automatic restarts on crashes

## Costs

**Free Tier:**
- $5 credit/month
- ~500 hours/month
- Enough for development/testing

**After free tier:**
- Pay-as-you-go
- ~$5-10/month for small app

## Next Steps

Once deployed:
1. Update browser extension API endpoint
2. Test with extension
3. Set up Stripe webhooks (optional)
4. Configure custom domain (optional)

---

**Need help?** Check Railway docs: https://docs.railway.app
