const express = require('express');
const { verifyWebhookSignature } = require('../services/stripe-service');
const { logSecurity } = require('../utils/logger');

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
  
  // TODO: Update database with customer subscription
  // - Get user by customer_id
  // - Update user plan
  // - Reset usage counters
  // - Send welcome email
  
  const subscription_id = session.subscription;
  const customer_id = session.customer;
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Subscription: ${subscription_id}`);
  
  // Example database update (implement with your DB):
  // await db.users.update({
  //   stripe_customer_id: customer_id,
  //   stripe_subscription_id: subscription_id,
  //   plan: 'PRO',
  //   subscription_status: 'active'
  // });
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
  
  // TODO: Update database
  // await db.users.update({
  //   stripe_customer_id: customer_id,
  //   stripe_subscription_id: subscription.id,
  //   plan: plan,
  //   subscription_status: status
  // });
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
  
  // TODO: Update database
  // await db.users.update({
  //   stripe_subscription_id: subscription.id,
  //   plan: plan,
  //   subscription_status: status
  // });
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`[Stripe] Subscription cancelled: ${subscription.id}`);
  
  const customer_id = subscription.customer;
  
  console.log(`   Customer: ${customer_id}`);
  console.log(`   Downgrading to FREE tier`);
  
  // TODO: Downgrade user to FREE tier
  // await db.users.update({
  //   stripe_subscription_id: null,
  //   plan: 'FREE',
  //   subscription_status: 'cancelled'
  // });
  
  // Send cancellation email
  // await sendEmail(user.email, 'subscription_cancelled', {...});
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
  
  // TODO: Log payment, send receipt
  // await db.payments.create({
  //   stripe_customer_id: customer_id,
  //   invoice_id: invoice.id,
  //   amount: amount_paid,
  //   status: 'succeeded'
  // });
  
  // Send receipt email
  // await sendEmail(user.email, 'payment_receipt', {amount: amount_paid});
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
  
  // TODO: Notify user, suspend account after retries
  // await sendEmail(user.email, 'payment_failed', {amount: amount_due});
  
  // If this is final attempt, downgrade to FREE
  if (invoice.attempt_count >= 3) {
    console.log(`   Final payment attempt failed - downgrading to FREE`);
    // await db.users.update({plan: 'FREE', subscription_status: 'past_due'});
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
