const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Integration Service
 * Handles subscriptions, customers, and payments
 */

// Pricing tiers
const PRICING_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    requests: 100,
    features: ['Basic PII detection', 'MASK redaction only', 'Community support']
  },
  PRO: {
    name: 'Pro',
    price: 99,
    requests: 10000,
    features: ['All PII types', 'PARTIAL + HASH redaction', 'Compliance reports', 'Email support']
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 499,
    requests: -1, // unlimited
    features: ['Everything in Pro', 'TOKEN + REMOVE strategies', 'Custom patterns', 'SSO', 'SLA', 'Dedicated support']
  }
};

/**
 * Create Stripe customer
 */
async function createCustomer(email, name, metadata = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    return customer;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw error;
  }
}

/**
 * Create checkout session
 */
async function createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });
    
    return session;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw error;
  }
}

/**
 * Create subscription
 */
async function createSubscription(customerId, priceId, trialDays = 0) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });
    
    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, immediately = false) {
  try {
    if (immediately) {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } else {
      // Cancel at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return subscription;
    }
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
}

/**
 * Update subscription
 */
async function updateSubscription(subscriptionId, newPriceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'create_prorations'
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    throw error;
  }
}

/**
 * Get customer portal URL
 */
async function createCustomerPortalSession(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    
    return session.url;
  } catch (error) {
    console.error('Failed to create portal session:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to get subscription:', error);
    throw error;
  }
}

/**
 * Get customer subscriptions
 */
async function getCustomerSubscriptions(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10
    });
    
    return subscriptions.data;
  } catch (error) {
    console.error('Failed to get customer subscriptions:', error);
    throw error;
  }
}

/**
 * Get usage for subscription
 */
async function getUsage(subscriptionItemId, startDate, endDate) {
  try {
    const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
      subscriptionItemId,
      {
        limit: 100
      }
    );
    
    return usageRecords.data;
  } catch (error) {
    console.error('Failed to get usage:', error);
    throw error;
  }
}

/**
 * Report usage (for metered billing)
 */
async function reportUsage(subscriptionItemId, quantity, timestamp = null) {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment'
      }
    );
    
    return usageRecord;
  } catch (error) {
    console.error('Failed to report usage:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

/**
 * Get plan limits
 */
function getPlanLimits(planName) {
  const tier = PRICING_TIERS[planName.toUpperCase()];
  if (!tier) {
    return PRICING_TIERS.FREE;
  }
  return tier;
}

/**
 * Check if customer can make request
 */
function canMakeRequest(usage, limit) {
  if (limit === -1) return true; // unlimited
  return usage < limit;
}

module.exports = {
  PRICING_TIERS,
  createCustomer,
  createCheckoutSession,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  createCustomerPortalSession,
  getSubscription,
  getCustomerSubscriptions,
  getUsage,
  reportUsage,
  verifyWebhookSignature,
  getPlanLimits,
  canMakeRequest
};
