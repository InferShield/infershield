const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

/**
 * Rate limiting middleware for API endpoints
 * Uses Redis for distributed rate limiting
 */

// Create Redis client (in production, use environment variables)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => {
  console.error('Redis rate limit error:', err);
});

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP
 */
const standardLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:standard:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});

/**
 * Strict rate limiter for sensitive operations (report generation, auth)
 * 10 requests per 15 minutes per IP
 */
const strictLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:strict:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many requests for this operation, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Auth rate limiter for login/registration endpoints
 * 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed auth attempts
});

/**
 * Report generation rate limiter
 * 3 reports per hour per API key
 */
const reportLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:report:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Report generation limit exceeded. Maximum 3 reports per hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by API key instead of IP for authenticated requests
  keyGenerator: (req) => {
    return req.user?.apiKey || req.ip;
  }
});

module.exports = {
  standardLimiter,
  strictLimiter,
  authLimiter,
  reportLimiter,
  redisClient
};
