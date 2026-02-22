# Stripe Configuration TODO

## Required: Create Stripe Price IDs

Before the Pro upgrade flow will work, you need to create Stripe Price IDs in your Stripe Dashboard:

### Steps:

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/products
2. **Create Pro Product**:
   - Name: "InferShield Pro"
   - Description: "10,000 requests/month with advanced PII detection"
   - Pricing: $99/month (recurring)
   - Copy the **Price ID** (starts with `price_`)

3. **Create Enterprise Product**:
   - Name: "InferShield Enterprise"
   - Description: "Unlimited requests with dedicated support"
   - Pricing: $499/month (recurring)
   - Copy the **Price ID** (starts with `price_`)

### Update Environment Variables:

Add these to your `.env` file:

```bash
# Stripe Price IDs (replace with actual IDs from Stripe Dashboard)
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxx
```

### Update Frontend Code:

In `backend/public/pricing.html`, replace:

```javascript
priceId: 'price_pro' // TODO: Replace with actual Stripe Price ID
```

With:

```javascript
priceId: process.env.STRIPE_PRICE_PRO || 'price_xxxxxxxxxxxxx'
```

Or better yet, create an API endpoint that returns the price IDs from the backend.

---

## Current Status:

✅ Pricing page created (`/pricing.html`)
✅ Pro upgrade button triggers Stripe checkout
✅ Enterprise button opens contact form
✅ Contact form logs to console (TODO: send email)
❌ Need actual Stripe Price IDs configured
❌ Need email service for enterprise sales leads

---

## Testing Checklist:

1. Create Stripe Price IDs
2. Update .env with price IDs
3. Update pricing.html with actual price IDs
4. Test Pro upgrade flow end-to-end
5. Test Enterprise contact form
6. Set up email notifications for sales leads (SendGrid/Postmark)
