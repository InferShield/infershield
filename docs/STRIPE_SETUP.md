# Stripe Integration Setup

Complete guide to integrating Stripe payments with InferShield.

## Quick Start

### 1. Get Stripe Keys

1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy your **Secret key** (starts with `sk_test_...`)
4. Copy your **Publishable key** (starts with `pk_test_...`)

### 2. Add Keys to Environment

Create `.env` file in `backend/` directory:

\`\`\`bash
# Stripe keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET  # Add after step 4
\`\`\`

### 3. Install Dependencies

\`\`\`bash
cd backend
npm install
\`\`\`

### 4. Run Setup Script

This automatically creates products and prices in Stripe:

\`\`\`bash
node scripts/setup-stripe.js
\`\`\`

**Output:**
\`\`\`
🚀 Setting up Stripe...

📦 Creating products...
   ✓ Created InferShield Free (prod_ABC123)
   ✓ Created InferShield Pro (prod_DEF456)
   ✓ Free tier - no price created
   ✓ Created price $99/month (price_GHI789)
   ✓ Created InferShield Enterprise (prod_JKL012)
   ✓ Created price $499/month (price_MNO345)

💳 Stripe setup complete!

📋 Product IDs:
   FREE: prod_ABC123
   PRO: prod_DEF456
   ENTERPRISE: prod_JKL012

💰 Price IDs:
   PRO: price_GHI789 ($99/month)
   ENTERPRISE: price_MNO345 ($499/month)

✓ Product/Price IDs saved to .env.stripe
\`\`\`

### 5. Configure Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Enter URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_...`)
7. Add to `.env`:
   \`\`\`bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SIGNING_SECRET
   \`\`\`

### 6. Test Locally with Stripe CLI

\`\`\`bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed
\`\`\`

## Pricing Tiers

### Free Tier ($0/month)
- 100 requests/month
- Basic PII detection
- MASK redaction only
- Community support

### Pro Tier ($99/month)
- 10,000 requests/month
- All PII types
- PARTIAL + HASH redaction
- Compliance reports
- Email support

### Enterprise Tier ($499/month)
- Unlimited requests
- Everything in Pro
- TOKEN + REMOVE strategies
- Custom patterns
- SSO
- SLA
- Dedicated support

## API Usage

### Create Customer

\`\`\`javascript
const { createCustomer } = require('./services/stripe-service');

const customer = await createCustomer(
  'user@example.com',
  'John Doe',
  { user_id: 'user_123' }
);
\`\`\`

### Create Checkout Session

\`\`\`javascript
const { createCheckoutSession } = require('./services/stripe-service');

const session = await createCheckoutSession(
  customer.id,
  'price_GHI789', // Pro tier price ID
  'https://infershield.io/success',
  'https://infershield.io/cancel'
);

// Redirect user to session.url
res.redirect(303, session.url);
\`\`\`

### Check Plan Limits

\`\`\`javascript
const { checkPlanLimits } = require('./middleware/subscription');

// Apply to routes
app.use('/api/scan', checkPlanLimits());
\`\`\`

### Require Specific Plan

\`\`\`javascript
const { requirePlan } = require('./middleware/subscription');

// Pro-only endpoint
app.get('/api/compliance-report', 
  requirePlan('PRO'),
  async (req, res) => {
    // ...
  }
);
\`\`\`

### Check Feature Availability

\`\`\`javascript
const { checkFeature } = require('./middleware/subscription');

// Enterprise-only feature
app.post('/api/custom-pattern',
  checkFeature('custom_patterns'),
  async (req, res) => {
    // ...
  }
);
\`\`\`

### Create Customer Portal Session

\`\`\`javascript
const { createCustomerPortalSession } = require('./services/stripe-service');

const portalUrl = await createCustomerPortalSession(
  customer.id,
  'https://infershield.io/dashboard'
);

// Redirect to portal
res.redirect(portalUrl);
\`\`\`

## Webhook Events

The webhook handler automatically processes these events:

### checkout.session.completed
- User completed payment
- Create subscription in database
- Send welcome email

### customer.subscription.created
- New subscription created
- Update user plan
- Reset usage counters

### customer.subscription.updated
- Plan upgraded/downgraded
- Update database
- Notify user

### customer.subscription.deleted
- Subscription cancelled
- Downgrade to FREE tier
- Send cancellation email

### invoice.payment_succeeded
- Payment successful
- Log payment
- Send receipt

### invoice.payment_failed
- Payment failed
- Notify user
- After 3 attempts: downgrade to FREE

## Database Schema

Add these fields to your users table:

\`\`\`sql
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50);
ALTER TABLE users ADD COLUMN monthly_requests INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN requests_reset_at TIMESTAMP;
\`\`\`

## Testing

### Test Cards

Use these test card numbers:

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires authentication:** 4000 0025 0000 3155

Any future expiry date and CVC work.

### Test Webhooks

\`\`\`bash
# Trigger checkout success
stripe trigger checkout.session.completed

# Trigger subscription created
stripe trigger customer.subscription.created

# Trigger payment failed
stripe trigger invoice.payment_failed
\`\`\`

## Production Checklist

Before going live:

- [ ] Replace test keys with live keys (`sk_live_...`, `pk_live_...`)
- [ ] Update webhook endpoint to production URL
- [ ] Copy new webhook signing secret
- [ ] Enable Stripe Radar (fraud prevention)
- [ ] Configure customer portal settings
- [ ] Set up tax collection (if applicable)
- [ ] Test full checkout flow
- [ ] Test webhook delivery
- [ ] Monitor Stripe dashboard for issues

## Security

### Webhook Verification

Always verify webhook signatures:

\`\`\`javascript
const { verifyWebhookSignature } = require('./services/stripe-service');

try {
  const event = verifyWebhookSignature(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );
  // Process event
} catch (error) {
  // Invalid signature
  return res.status(400).send('Invalid signature');
}
\`\`\`

### Key Management

- **Never commit keys** to Git
- Use `.env` files (add to `.gitignore`)
- Rotate keys regularly
- Use different keys for test/production
- Restrict API key permissions

## Troubleshooting

### "No such customer" Error

Customer ID doesn't exist in Stripe. Create customer first:

\`\`\`javascript
const customer = await createCustomer(email, name);
\`\`\`

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify endpoint is publicly accessible
3. Check Stripe Dashboard → Webhooks → Logs
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### "Rate limit exceeded" on Local Development

Use test mode keys, not live keys. Test mode has higher rate limits.

### Subscription Not Updating

Check webhook logs in Stripe Dashboard. Ensure webhook events are selected and endpoint is active.

## Support

- **Stripe Docs:** https://stripe.com/docs/api
- **Stripe Support:** https://support.stripe.com
- **InferShield Issues:** https://github.com/InferShield/infershield/issues

## Cost Estimates

**Stripe fees:**
- 2.9% + $0.30 per successful charge
- No monthly or setup fees

**Example revenue:**
- 100 Pro customers ($99/mo): $9,900/mo
- Stripe fees (~3%): $297/mo
- **Net revenue:** $9,603/mo

## Further Reading

- [Stripe Billing](https://stripe.com/docs/billing)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
