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
    const { plan } = req.body; // 'pro' or 'enterprise'

    if (!req.user.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer associated with account'
      });
    }

    // Get price ID from environment
    let priceId;
    if (plan === 'pro') {
      priceId = process.env.STRIPE_PRICE_PRO;
    } else if (plan === 'enterprise') {
      priceId = process.env.STRIPE_PRICE_ENTERPRISE;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be "pro" or "enterprise"'
      });
    }

    if (!priceId) {
      return res.status(500).json({
        success: false,
        error: 'Pricing not configured. Please contact support.'
      });
    }

    const successUrl = `${process.env.FRONTEND_URL || 'https://app.infershield.io'}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'https://app.infershield.io'}/pricing.html`;

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

/**
 * POST /api/billing/contact
 * Handle enterprise sales contact form
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, company, volume, message } = req.body;

    // TODO: Implement email notification to sales team
    // For now, log the inquiry
    console.log('[Sales Inquiry]', {
      name,
      email,
      company,
      volume,
      message,
      user_id: req.user.id,
      timestamp: new Date().toISOString()
    });

    // TODO: Send email via SendGrid/Postmark/etc
    // await sendSalesNotification({ name, email, company, volume, message });

    res.json({
      success: true,
      message: 'Thank you! Our sales team will contact you within 24 hours.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
