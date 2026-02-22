const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const stripeService = require('../services/stripe-service');

// All routes require JWT authentication
router.use(authenticateJWT);

/**
 * POST /api/billing/checkout
 * Create Stripe checkout session for upgrading plan
 */
router.post('/checkout', async (req, res) => {
  try {
    const { priceId } = req.body;

    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer associated with account'
      });
    }

    const successUrl = `${process.env.FRONTEND_URL || 'https://infershield.io'}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'https://infershield.io'}/dashboard`;

    const session = await stripeService.createCheckoutSession(
      req.user.stripe_customer_id,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/billing/portal
 * Get Stripe customer portal URL for managing subscription
 */
router.post('/portal', async (req, res) => {
  try {
    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer associated with account'
      });
    }

    const returnUrl = `${process.env.FRONTEND_URL || 'https://infershield.io'}/dashboard`;

    const portalUrl = await stripeService.createCustomerPortalSession(
      req.user.stripe_customer_id,
      returnUrl
    );

    res.json({
      success: true,
      url: portalUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/billing/subscription
 * Get current subscription details
 */
router.get('/subscription', async (req, res) => {
  try {
    if (!req.user.stripe_subscription_id) {
      return res.json({
        success: true,
        subscription: null,
        plan: req.user.plan || 'free'
      });
    }

    const subscription = await stripeService.getSubscription(req.user.stripe_subscription_id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        plan: req.user.plan
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
