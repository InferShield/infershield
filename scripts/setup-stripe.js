#!/usr/bin/env node

/**
 * Stripe Setup Script
 * Automatically creates products, prices, and configures Stripe account
 * 
 * Usage: node scripts/setup-stripe.js
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Product definitions
const PRODUCTS = [
  {
    name: 'InferShield Free',
    description: 'Basic PII protection for personal projects',
    metadata: {
      tier: 'FREE',
      requests_limit: '100',
      features: 'Basic PII detection, MASK redaction only, Community support'
    }
  },
  {
    name: 'InferShield Pro',
    description: 'Advanced PII protection with compliance reporting',
    metadata: {
      tier: 'PRO',
      requests_limit: '10000',
      features: 'All PII types, PARTIAL + HASH redaction, Compliance reports, Email support'
    }
  },
  {
    name: 'InferShield Enterprise',
    description: 'Complete PII protection with SSO and dedicated support',
    metadata: {
      tier: 'ENTERPRISE',
      requests_limit: 'unlimited',
      features: 'Everything in Pro, TOKEN + REMOVE strategies, Custom patterns, SSO, SLA, Dedicated support'
    }
  }
];

// Price definitions (monthly)
const PRICES = {
  FREE: 0,
  PRO: 9900, // $99.00 in cents
  ENTERPRISE: 49900 // $499.00 in cents
};

async function setupStripe() {
  console.log('🚀 Setting up Stripe...\n');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment');
    console.error('   Please set STRIPE_SECRET_KEY in .env file');
    process.exit(1);
  }
  
  const results = {
    products: [],
    prices: []
  };
  
  try {
    // Create products
    console.log('📦 Creating products...');
    
    for (const productDef of PRODUCTS) {
      const tier = productDef.metadata.tier;
      
      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `metadata['tier']:'${tier}'`,
        limit: 1
      });
      
      if (existingProducts.data.length > 0) {
        console.log(`   ✓ ${productDef.name} already exists (${existingProducts.data[0].id})`);
        results.products.push(existingProducts.data[0]);
        continue;
      }
      
      // Create product
      const product = await stripe.products.create({
        name: productDef.name,
        description: productDef.description,
        metadata: productDef.metadata
      });
      
      console.log(`   ✓ Created ${productDef.name} (${product.id})`);
      results.products.push(product);
      
      // Create price for this product
      const priceAmount = PRICES[tier];
      
      if (priceAmount === 0) {
        // Free tier - no price needed
        console.log(`   ✓ Free tier - no price created`);
      } else {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceAmount,
          currency: 'usd',
          recurring: {
            interval: 'month'
          },
          metadata: {
            tier: tier
          }
        });
        
        console.log(`   ✓ Created price $${priceAmount / 100}/month (${price.id})`);
        results.prices.push(price);
      }
    }
    
    console.log('\n💳 Stripe setup complete!\n');
    
    // Display results
    console.log('📋 Product IDs:');
    for (const product of results.products) {
      console.log(`   ${product.metadata.tier}: ${product.id}`);
    }
    
    console.log('\n💰 Price IDs:');
    for (const price of results.prices) {
      console.log(`   ${price.metadata.tier}: ${price.id} ($${price.unit_amount / 100}/month)`);
    }
    
    // Save to .env.stripe for reference
    const envContent = results.products.map(p => 
      `STRIPE_PRODUCT_${p.metadata.tier}=${p.id}`
    ).join('\n') + '\n' + results.prices.map(p => 
      `STRIPE_PRICE_${p.metadata.tier}=${p.id}`
    ).join('\n');
    
    const fs = require('fs');
    fs.writeFileSync('.env.stripe', envContent);
    console.log('\n✓ Product/Price IDs saved to .env.stripe');
    
    console.log('\n📝 Next steps:');
    console.log('   1. Add webhook endpoint in Stripe Dashboard:');
    console.log('      https://dashboard.stripe.com/webhooks');
    console.log('      Endpoint URL: https://your-domain.com/api/webhooks/stripe');
    console.log('      Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted');
    console.log('   2. Copy webhook signing secret to .env as STRIPE_WEBHOOK_SECRET');
    console.log('   3. Copy .env.stripe contents to your .env file');
    console.log('   4. Restart application');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupStripe().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
