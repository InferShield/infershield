const express = require('express');
const { verifyWebhookSignature } = require('../services/stripe-service');
const { logSecurity } = require('../utils/logger');
const db = require('../database/db');

const router = express.Router();

/**
 * Stripe Webhook Handler
 * Processes Stripe events (payment success, subscription updates, etc.)
 */

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('[Stripe] Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }
  
  let event;
  
  try {
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    logSecurity('stripe_webhook_invalid_signature', 'high', null, { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  console.log(`[Stripe] Received event: ${event.type}`);
  
  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('[Stripe] Webhook handler error:', error);
    logSecurity('stripe_webhook_error', 'high', null, { 
      event_type: event.type,
      error: error.message 
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session) {
  console.log(`[Stripe] Checkout completed for customer: ${session.customer}`);
  
  const subscription_id = session.subscription;
  const customer_id = session.customer;
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Subscription: ${subscription_id}`);
  
  // Update user with subscription ID
  const updated = await db('users')
    .where({ stripe_customer_id: customer_id })
    .update({
      stripe_subscription_id: subscription_id,
      updated_at: db.fn.now()
    });
  
  if (updated) {
    console.log(`   ✓ Updated user record`);
  } else {
    console.warn(`   ⚠ No user found with customer_id: ${customer_id}`);
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  console.log(`[Stripe] Subscription created: ${subscription.id}`);
  
  const customer_id = subscription.customer;
  const status = subscription.status;
  const plan = getPlanFromSubscription(subscription);
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Plan: ${plan}`);
  console.log(`   Status: ${status}`);
  
  // Update user plan and status
  const updated = await db('users')
    .where({ stripe_customer_id: customer_id })
    .update({
      stripe_subscription_id: subscription.id,
      plan: plan.toLowerCase(),
      status: status === 'active' || status === 'trialing' ? 'active' : 'suspended',
      updated_at: db.fn.now()
    });
  
  if (updated) {
    console.log(`   ✓ Updated user to ${plan} plan`);
  } else {
    console.warn(`   ⚠ No user found with customer_id: ${customer_id}`);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`[Stripe] Subscription updated: ${subscription.id}`);
  
  const customer_id = subscription.customer;
  const status = subscription.status;
  const plan = getPlanFromSubscription(subscription);
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Plan: ${plan}`);
  console.log(`   Status: ${status}`);
  
  // Update user plan and status
  const updated = await db('users')
    .where({ stripe_customer_id: customer_id })
    .update({
      plan: plan.toLowerCase(),
      status: status === 'active' || status === 'trialing' ? 'active' : 'suspended',
      updated_at: db.fn.now()
    });
  
  if (updated) {
    console.log(`   ✓ Updated user to ${plan} plan (status: ${status})`);
  } else {
    console.warn(`   ⚠ No user found with customer_id: ${customer_id}`);
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`[Stripe] Subscription cancelled: ${subscription.id}`);
  
  const customer_id = subscription.customer;
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Downgrading to FREE tier`);
  
  // Downgrade user to FREE tier
  const updated = await db('users')
    .where({ stripe_customer_id: customer_id })
    .update({
      stripe_subscription_id: null,
      plan: 'free',
      status: 'active', // Keep account active on free plan
      updated_at: db.fn.now()
    });
  
  if (updated) {
    console.log(`   ✓ User downgraded to FREE plan`);
  } else {
    console.warn(`   ⚠ No user found with customer_id: ${customer_id}`);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  console.log(`[Stripe] Payment succeeded: ${invoice.id}`);
  
  const customer_id = invoice.customer;
  const amount_paid = invoice.amount_paid / 100; // cents to dollars
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Amount: $${amount_paid}`);
  
  // Ensure user is active after successful payment
  const updated = await db('users')
    .where({ stripe_customer_id: customer_id })
    .update({
      status: 'active',
      updated_at: db.fn.now()
    });
  
  if (updated) {
    console.log(`   ✓ User reactivated`);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log(`[Stripe] Payment failed: ${invoice.id}`);
  
  const customer_id = invoice.customer;
  const amount_due = invoice.amount_due / 100;
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Amount due: $${amount_due}`);
  console.log(`   Attempt: ${invoice.attempt_count}`);
  
  // If this is final attempt (3rd), downgrade to FREE
  if (invoice.attempt_count >= 3) {
    console.log(`   Final payment attempt failed - downgrading to FREE`);
    
    await db('users')
      .where({ stripe_customer_id: customer_id })
      .update({
        plan: 'free',
        stripe_subscription_id: null,
        status: 'active', // Keep active on free plan
        updated_at: db.fn.now()
      });
    
    console.log(`   ✓ User downgraded to FREE plan`);
  }
}

/**
 * Extract plan tier from subscription
 */
function getPlanFromSubscription(subscription) {
  if (!subscription.items || subscription.items.data.length === 0) {
    return 'FREE';
  }
  
  const price = subscription.items.data[0].price;
  if (!price.metadata || !price.metadata.tier) {
    return 'FREE';
  }
  
  return price.metadata.tier;
}

module.exports = router;
