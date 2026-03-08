/**
 * Redis Configuration
 * 
 * Supports multiple deployment scenarios:
 * - Development: Local Redis
 * - Production: Railway Redis addon or external provider
 * - Fallback: In-memory if Redis unavailable
 */

const config = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // TLS for production
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Timeouts
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000,  // 5 seconds
  
  // Reconnection strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Redis reconnection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  
  // Session-specific settings
  session: {
    prefix: 'session:',
    defaultTTL: parseInt(process.env.SESSION_TTL || '3600', 10), // 1 hour default
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '300000', 10), // 5 minutes
  },
  
  // Feature flags
  enabled: process.env.USE_REDIS_SESSIONS !== 'false', // Enabled by default
  fallbackToMemory: process.env.REDIS_FALLBACK_MEMORY === 'true', // Graceful degradation
};

/**
 * Parse Redis connection URL (e.g., redis://user:pass@host:port/db)
 * Railway and many providers use this format
 */
if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    config.host = url.hostname;
    config.port = parseInt(url.port, 10) || 6379;
    config.password = url.password || undefined;
    
    // Extract database number from pathname
    const dbMatch = url.pathname.match(/\/(\d+)/);
    if (dbMatch) {
      config.db = parseInt(dbMatch[1], 10);
    }
    
    // TLS detection
    if (url.protocol === 'rediss:') {
      config.tls = {};
    }
    
    console.log(`✅ Parsed REDIS_URL: ${url.hostname}:${config.port}/${config.db}`);
  } catch (error) {
    console.error('❌ Failed to parse REDIS_URL:', error.message);
  }
}

module.exports = config;
