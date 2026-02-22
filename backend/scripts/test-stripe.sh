#!/bin/bash

# Test Stripe API connectivity
echo "🦞 Testing Stripe API connection..."
echo ""

cd "$(dirname "$0")/.."

# Load environment
if [ ! -f .env ]; then
    echo "❌ No .env file found!"
    echo "Please create backend/.env with your Stripe keys"
    exit 1
fi

# Test with Node
node -e "
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    console.log('Testing Stripe API key...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Stripe connected successfully!');
    console.log('');
    console.log('Account Details:');
    console.log('  Business name:', account.business_profile?.name || 'Not set');
    console.log('  Email:', account.email);
    console.log('  Country:', account.country);
    console.log('');
    console.log('Ready to initialize products! Run:');
    console.log('  node scripts/init-stripe.js');
    process.exit(0);
  } catch (error) {
    console.log('❌ Stripe API test failed');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    if (error.type === 'StripeAuthenticationError') {
      console.log('Your STRIPE_SECRET_KEY is invalid or expired.');
      console.log('');
      console.log('To fix:');
      console.log('1. Go to: https://dashboard.stripe.com/test/apikeys');
      console.log('2. Copy your Secret key (starts with sk_test_)');
      console.log('3. Update STRIPE_SECRET_KEY in backend/.env');
      console.log('4. Run this test again');
    }
    process.exit(1);
  }
})();
"
