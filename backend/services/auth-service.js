const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

class AuthService {
  /**
   * Register a new user
   */
  async register({ email, password, name, company }) {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user exists
    const existing = await db('users').where({ email }).first();
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString('hex');

    // Create Stripe customer
    let stripe_customer_id = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const customer = await stripe.customers.create({
          email,
          name,
          metadata: {
            company: company || '',
            source: 'infershield_signup'
          }
        });
        stripe_customer_id = customer.id;
      } catch (stripeError) {
        console.error('Stripe customer creation failed:', stripeError.message);
        // Continue without Stripe - user can still use free plan
      }
    }

    // Create user
    const [user] = await db('users').insert({
      email,
      password_hash,
      name,
      company,
      verification_token,
      verification_sent_at: db.fn.now(),
      status: 'active',
      stripe_customer_id
    }).returning('*');

    // Remove sensitive fields
    delete user.password_hash;
    delete user.verification_token;

    return user;
  }

  /**
   * Login user
   */
  async login({ email, password, ip }) {
    // Find user
    const user = await db('users')
      .where({ email, status: 'active' })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account temporarily locked. Try again later.');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      // Increment failed attempts
      await db('users')
        .where({ id: user.id })
        .increment('failed_login_attempts', 1);

      // Lock after 5 failed attempts
      if (user.failed_login_attempts >= 4) {
        await db('users')
          .where({ id: user.id })
          .update({
            locked_until: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
          });
      }

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts, update last login
    await db('users')
      .where({ id: user.id })
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: db.fn.now(),
        last_login_ip: ip
      });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove sensitive fields
    delete user.password_hash;
    delete user.verification_token;

    return { user, token };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await db('users')
      .where({ id: userId, status: 'active' })
      .whereNull('deleted_at')
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    delete user.password_hash;
    delete user.verification_token;

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    const allowed = ['name', 'company'];
    const filtered = Object.keys(updates)
      .filter(key => allowed.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const [user] = await db('users')
      .where({ id: userId })
      .update({ ...filtered, updated_at: db.fn.now() })
      .returning('*');

    delete user.password_hash;
    delete user.verification_token;

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await db('users').where({ id: userId }).first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db('users')
      .where({ id: userId })
      .update({ password_hash, updated_at: db.fn.now() });

    return true;
  }
}

module.exports = new AuthService();
