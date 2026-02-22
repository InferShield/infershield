#!/usr/bin/env node

/**
 * Initialize Stripe Products and Prices
 * Run this once to set up InferShield pricing in Stripe
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: 'InferShield Pro',
    description: '10,000 requests/month with advanced PII detection and compliance features',
    price: 9900, // $99.00
    interval: 'month',
    features: [
      'All PII types',
      'PARTIAL + HASH redaction',
      'Compliance reports',
      'Email support'
    ]
  },
  {
    name: 'InferShield Enterprise',
    description: 'Unlimited requests with dedicated support and custom integrations',
    price: 49900, // $499.00
    interval: 'month',
    features: [
      'Everything in Pro',
      'Unlimited requests',
      'TOKEN + REMOVE strategies',
      'Custom patterns',
      'SSO integration',
      'SLA guarantee',
      'Dedicated support'
    ]
  }
];

async function initializeStripe() {
  console.log('🦞 Initializing InferShield Stripe products...\n');

  try {
    // Check existing products
    const existingProducts = await stripe.products.list({ limit: 100 });
    console.log(`Found ${existingProducts.data.length} existing products\n`);

    for (const productConfig of PRODUCTS) {
      console.log(`Creating: ${productConfig.name}`);

      // Check if product already exists
      const existing = existingProducts.data.find(p => p.name === productConfig.name);

      let product;
      if (existing) {
        console.log(`  ✓ Product already exists: ${existing.id}`);
        product = existing;
      } else {
        // Create product
        product = await stripe.products.create({
          name: productConfig.name,
          description: productConfig.description,
          metadata: {
            features: JSON.stringify(productConfig.features)
          }
        });
        console.log(`  ✓ Created product: ${product.id}`);
      }

      // Check if price exists for this product
      const existingPrices = await stripe.prices.list({ product: product.id });
      const activePrice = existingPrices.data.find(p => 
        p.active && 
        p.unit_amount === productConfig.price &&
        p.recurring?.interval === productConfig.interval
      );

      if (activePrice) {
        console.log(`  ✓ Price already exists: ${activePrice.id}`);
        console.log(`    Amount: $${(activePrice.unit_amount / 100).toFixed(2)}/${activePrice.recurring.interval}`);
      } else {
        // Create price
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: productConfig.price,
          currency: 'usd',
          recurring: {
            interval: productConfig.interval
          }
        });
        console.log(`  ✓ Created price: ${price.id}`);
        console.log(`    Amount: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`);
      }

      console.log('');
    }

    // List all products and prices
    console.log('\n=== SUMMARY ===\n');
    const allProducts = await stripe.products.list({ limit: 100 });
    
    for (const product of allProducts.data) {
      if (product.name.includes('InferShield')) {
        console.log(`${product.name} (${product.id})`);
        
        const prices = await stripe.prices.list({ product: product.id, active: true });
        for (const price of prices.data) {
          console.log(`  → Price: ${price.id}`);
          console.log(`     $${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || 'one-time'}`);
        }
        console.log('');
      }
    }

    console.log('\n✅ Stripe initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Copy the Price IDs above');
    console.log('2. Update backend/.env with:');
    console.log('   STRIPE_PRICE_PRO=price_xxxxx');
    console.log('   STRIPE_PRICE_ENTERPRISE=price_xxxxx');
    console.log('3. Update pricing.html to use these Price IDs');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\nPlease check your STRIPE_SECRET_KEY in .env file');
      console.error('Get your keys from: https://dashboard.stripe.com/test/apikeys');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeStripe();
}

module.exports = { initializeStripe };
