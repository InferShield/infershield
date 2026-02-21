const Redis = require("ioredis");
const crypto = require("crypto");

// Redis Configuration
const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redisClient.on("connect", () => {
  console.log("[CacheService] Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("[CacheService] Redis connection error:", err);
});

// Helper to generate cache keys
const generateKey = (type, key) => `infershield:cache:${type}:${crypto.createHash("md5").update(key).digest("hex")}`;

const CacheService = {
  async get(key) {
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.error("[CacheService] Failed to get key:", key, err);
      return null; // Graceful degradation
    }
  },

  async set(key, value, ttlSeconds) {
    try {
      const data = typeof value === "string" ? value : JSON.stringify(value);
      await redisClient.setex(key, ttlSeconds, data);
    } catch (err) {
      console.error("[CacheService] Failed to set key:", key, err);
    }
  },

  async invalidate(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (err) {
      console.error("[CacheService] Failed to invalidate pattern:", pattern, err);
    }
  },

  generateKey,
  DEFAULT_TTL: {
    AGGREGATION: 15 * 60, // 15 minutes
    STATS: 5 * 60,        // 5 minutes
  },
};

module.exports = CacheService;