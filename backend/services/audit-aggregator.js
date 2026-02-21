const db = require("../services/database");
const CacheService = require("./cache-service");

const AuditAggregator = {
  async aggregate(filters) {
    const cacheKey = CacheService.generateKey("audit", JSON.stringify(filters));
    
    try {
      // Check cache first
      const cachedData = await CacheService.get(cacheKey);
      if (cachedData) {
        console.log("[AuditAggregator] Cache hit for", cacheKey);
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.warn("[AuditAggregator] Cache check failed:", error);
    }
    
    console.log("[AuditAggregator] Cache miss for", cacheKey);

    // Perform expensive DB aggregation query
    const aggregation = await db.query(/* sql */`
      SELECT COUNT(*) as event_count, policy_type, severity
      FROM audit_logs
      WHERE <apply filters dynamically>
      GROUP BY policy_type, severity
    `);

    // Cache result
    CacheService.set(cacheKey, aggregation, CacheService.DEFAULT_TTL.AGGREGATION);
    
    return aggregation;
  },

  async invalidateCache() {
    try {
      await CacheService.invalidate("infershield:cache:audit:*");
      console.log("[AuditAggregator] Cache invalidated.");
    } catch (error) {
      console.error("[AuditAggregator] Cache invalidation error:", error);
    }
  },
};

module.exports = AuditAggregator;