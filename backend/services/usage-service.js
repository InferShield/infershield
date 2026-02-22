const db = require('../database/db');

// Plan limits (requests per month)
const PLAN_LIMITS = {
  free: 100,
  pro: 10000,
  enterprise: Infinity
};

class UsageService {
  /**
   * Record a request for usage tracking
   */
  async recordRequest(userId, apiKeyId, metadata = {}) {
    const now = new Date();
    const period_date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const period_hour = now.getHours();

    // Upsert usage record
    const existing = await db('usage_records')
      .where({ user_id: userId, period_date, period_hour })
      .first();

    if (existing) {
      // Increment existing record
      await db('usage_records')
        .where({ id: existing.id })
        .increment('request_count', 1)
        .increment(metadata.provider ? `requests_${metadata.provider}` : 'requests_other', 1)
        .increment('pii_detections', metadata.pii_detections || 0)
        .increment('pii_redactions', metadata.pii_redactions || 0);
    } else {
      // Create new record
      await db('usage_records').insert({
        user_id: userId,
        api_key_id: apiKeyId,
        period_date,
        period_hour,
        request_count: 1,
        [`requests_${metadata.provider || 'other'}`]: 1,
        pii_detections: metadata.pii_detections || 0,
        pii_redactions: metadata.pii_redactions || 0
      });
    }
    
    // Also update API key usage counter (if apiKeyId provided)
    if (apiKeyId) {
      await db('api_keys')
        .where({ id: apiKeyId })
        .increment('total_requests', 1)
        .update({
          last_used_at: db.fn.now(),
          first_used_at: db.raw('COALESCE(first_used_at, ?)', [db.fn.now()])
        });
    }
  }

  /**
   * Get current month usage for a user
   */
  async getMonthlyUsage(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await db('usage_records')
      .where({ user_id: userId })
      .where('period_date', '>=', startOfMonth.toISOString().split('T')[0])
      .sum('request_count as total_requests')
      .sum('pii_detections as total_pii_detections')
      .sum('pii_redactions as total_pii_redactions')
      .first();

    let totalRequests = parseInt(result.total_requests) || 0;
    let totalPiiDetections = parseInt(result.total_pii_detections) || 0;
    let totalPiiRedactions = parseInt(result.total_pii_redactions) || 0;

    // Fallback: if usage_records is empty, aggregate from api_keys table
    if (totalRequests === 0) {
      const keyUsage = await db('api_keys')
        .where({ user_id: userId })
        .sum('total_requests as total_requests')
        .first();
      
      if (keyUsage && keyUsage.total_requests) {
        totalRequests = parseInt(keyUsage.total_requests) || 0;
      }
    }

    return {
      total_requests: totalRequests,
      total_pii_detections: totalPiiDetections,
      total_pii_redactions: totalPiiRedactions
    };
  }

  /**
   * Check if user is within quota limits
   */
  async checkQuota(userId, plan) {
    const usage = await this.getMonthlyUsage(userId);
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    return {
      current: usage.total_requests,
      limit,
      remaining: limit === Infinity ? Infinity : Math.max(0, limit - usage.total_requests),
      exceeded: usage.total_requests >= limit,
      percentage: limit === Infinity ? 0 : Math.round((usage.total_requests / limit) * 100)
    };
  }

  /**
   * Get usage breakdown by day for current month
   */
  async getDailyUsage(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const records = await db('usage_records')
      .where({ user_id: userId })
      .where('period_date', '>=', startOfMonth.toISOString().split('T')[0])
      .select('period_date')
      .sum('request_count as requests')
      .sum('pii_detections as pii_detections')
      .groupBy('period_date')
      .orderBy('period_date', 'asc');

    return records.map(r => ({
      date: r.period_date,
      requests: parseInt(r.requests) || 0,
      pii_detections: parseInt(r.pii_detections) || 0
    }));
  }

  /**
   * Get usage by API key
   */
  async getUsageByKey(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const records = await db('usage_records')
      .leftJoin('api_keys', 'usage_records.api_key_id', 'api_keys.id')
      .where({ 'usage_records.user_id': userId })
      .where('period_date', '>=', startOfMonth.toISOString().split('T')[0])
      .select('api_keys.id', 'api_keys.name', 'api_keys.key_prefix')
      .sum('request_count as requests')
      .groupBy('api_keys.id', 'api_keys.name', 'api_keys.key_prefix')
      .orderBy('requests', 'desc');

    return records;
  }
}

module.exports = new UsageService();
