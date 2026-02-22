# 🚀 Deploy Stripe to Railway - URGENT

## Environment Variables to Add

Go to Railway dashboard → InferShield project → Variables tab and add these:

```bash
# Stripe LIVE Keys (use the keys Alex provided)
STRIPE_SECRET_KEY=sk_live_51T0WD56CAMERXE4U...
STRIPE_PUBLISHABLE_KEY=pk_live_51T0WD56CAMERXE4U...

# Stripe Price IDs (already configured)
STRIPE_PRICE_PRO=price_1T3Q0g6CAMERXE4U7dmCIKZI
STRIPE_PRICE_ENTERPRISE=price_1T3Q0h6CAMERXE4USLElvr47

# Frontend URL (for Stripe redirects)
FRONTEND_URL=https://app.infershield.io
```

**Note**: Use the full live Stripe keys you provided earlier (sk_live... and pk_live...)

## Steps:

1. **Railway Dashboard**: https://railway.app/
2. Select InferShield project
3. Click **Variables** tab
4. Add each variable above (with full keys)
5. Click **Save** (Railway will auto-redeploy)

## Verification After Deploy:

1. Visit: https://app.infershield.io/pricing.html
2. Click "Upgrade to Pro"
3. Should redirect to Stripe Checkout
4. Test with card: `4242 4242 4242 4242`

## What's Now Working:

✅ All 3 critical bugs fixed
✅ Dashboard shows correct usage stats  
✅ Pricing page with Pro + Enterprise tiers
✅ Stripe checkout integration complete
✅ Enterprise contact form ready
✅ Live payment processing enabled

## Status:

- **Local**: ✅ Fully configured and tested
- **Railway**: ⏳ Waiting for environment variables

Once Railway vars are set → **PRODUCTION READY** 🎉

---

**Time to complete**: ~2 minutes (just add the env vars)

