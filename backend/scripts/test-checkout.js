#!/usr/bin/env node

/**
 * Test Stripe Checkout Flow
 * Verifies that checkout sessions can be created
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testCheckout() {
  console.log('🦞 Testing Stripe Checkout Flow...\n');

  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: 'test@infershield.io',
      name: 'Test User',
      metadata: { test: 'true' }
    });
    console.log('✅ Test customer created:', customer.id);

    // Test Pro checkout
    console.log('\nTesting Pro plan checkout...');
    const proSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_PRO,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: 'https://app.infershield.io/dashboard.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.infershield.io/pricing.html'
    });
    console.log('✅ Pro checkout session created');
    console.log('   URL:', proSession.url);

    // Test Enterprise checkout
    console.log('\nTesting Enterprise plan checkout...');
    const enterpriseSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ENTERPRISE,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: 'https://app.infershield.io/dashboard.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.infershield.io/pricing.html'
    });
    console.log('✅ Enterprise checkout session created');
    console.log('   URL:', enterpriseSession.url);

    // Clean up test customer
    console.log('\nCleaning up test customer...');
    await stripe.customers.del(customer.id);
    console.log('✅ Test customer deleted');

    console.log('\n🎉 All checkout flows working!');
    console.log('\nReady for production:');
    console.log('  - Pro plan: $99/month');
    console.log('  - Enterprise plan: $499/month');
    console.log('  - Pricing page: https://app.infershield.io/pricing.html');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.type === 'StripeInvalidRequestError') {
      console.error('\nCheck that your Price IDs are correct:');
      console.error('  STRIPE_PRICE_PRO:', process.env.STRIPE_PRICE_PRO);
      console.error('  STRIPE_PRICE_ENTERPRISE:', process.env.STRIPE_PRICE_ENTERPRISE);
    }
    
    process.exit(1);
  }
}

testCheckout();
