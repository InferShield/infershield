const Redis = require("ioredis");

let redisClient;

const connectRedis = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    redisClient.on("connect", () => {
      console.log("[RedisConfig] Connected to Redis instance");
    });

    redisClient.on("error", (err) => {
      console.error("[RedisConfig] Redis connection error:", err);
    });
  }
  return redisClient;
};

module.exports = {
  getRedisClient: connectRedis,
};