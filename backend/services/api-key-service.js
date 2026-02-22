const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const BCRYPT_ROUNDS = 10;

class ApiKeyService {
  /**
   * Generate a new API key
   * Format: isk_live_<32 random chars> or isk_test_<32 random chars>
   */
  generateKey(environment = 'production') {
    const prefix = environment === 'production' ? 'isk_live' : 'isk_test';
    const randomPart = crypto.randomBytes(24).toString('base64url'); // URL-safe base64
    return `${prefix}_${randomPart}`;
  }

  /**
   * Create a new API key for a user
   */
  async createKey(userId, { name, description, environment = 'production', expiresIn }) {
    // Generate key
    const key = this.generateKey(environment);
    const key_prefix = key.substring(0, 16); // "isk_live_xxxxxxx"
    const key_hash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    // Calculate expiration
    let expires_at = null;
    if (expiresIn) {
      expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expiresIn);
    }

    // Insert into database
    const [apiKey] = await db('api_keys').insert({
      user_id: userId,
      key_hash,
      key_prefix,
      name,
      description,
      environment,
      expires_at,
      status: 'active'
    }).returning('*');

    // Return the plain key (only shown once!)
    return {
      ...apiKey,
      key, // Plain key - only returned on creation
      key_hash: undefined // Don't return hash
    };
  }

  /**
   * Validate an API key and return user info
   */
  async validateKey(key) {
    if (!key || !key.startsWith('isk_')) {
      throw new Error('Invalid API key format');
    }

    const key_prefix = key.substring(0, 16);

    // Find potential keys with matching prefix
    const candidates = await db('api_keys')
      .where({ key_prefix, status: 'active' })
      .whereNull('revoked_at')
      .where(function() {
        this.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
      });

    // Check each candidate with bcrypt
    for (const candidate of candidates) {
      const valid = await bcrypt.compare(key, candidate.key_hash);
      
      if (valid) {
        // Update last used timestamp
        await db('api_keys')
          .where({ id: candidate.id })
          .update({
            last_used_at: db.fn.now(),
            first_used_at: db.raw('COALESCE(first_used_at, NOW())')
          })
          .increment('total_requests', 1);

        // Get user info
        const user = await db('users')
          .where({ id: candidate.user_id, status: 'active' })
          .whereNull('deleted_at')
          .first();

        if (!user) {
          throw new Error('User not found or inactive');
        }

        return {
          apiKey: candidate,
          user: {
            id: user.id,
            email: user.email,
            plan: user.plan,
            stripe_customer_id: user.stripe_customer_id
          }
        };
      }
    }

    throw new Error('Invalid API key');
  }

  /**
   * List all keys for a user
   */
  async listKeys(userId) {
    const keys = await db('api_keys')
      .where({ user_id: userId })
      .whereIn('status', ['active', 'expired'])
      .orderBy('created_at', 'desc');

    // Remove sensitive data
    return keys.map(k => ({
      ...k,
      key_hash: undefined
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId, userId, reason) {
    const [key] = await db('api_keys')
      .where({ id: keyId, user_id: userId })
      .update({
        status: 'revoked',
        revoked_at: db.fn.now(),
        revoked_by_user_id: userId,
        revoked_reason: reason
      })
      .returning('*');

    if (!key) {
      throw new Error('API key not found');
    }

    return key;
  }

  /**
   * Get key details (without hash)
   */
  async getKey(keyId, userId) {
    const key = await db('api_keys')
      .where({ id: keyId, user_id: userId })
      .first();

    if (!key) {
      throw new Error('API key not found');
    }

    delete key.key_hash;
    return key;
  }
}

module.exports = new ApiKeyService();
