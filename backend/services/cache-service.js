const redis = require('redis');

/**
 * Cache service for compliance report data
 * Uses Redis for high-performance caching
 */
class CacheService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    });

    this.client.on('error', (err) => {
      console.error('Redis cache error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis cache connected');
    });

    // Default TTL: 1 hour
    this.defaultTTL = 3600;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value (parsed from JSON)
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching pattern
   * @param {string} pattern - Redis key pattern (e.g., 'report:*')
   */
  async delPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error(`Cache delPattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get report data from cache or fetch function
   * @param {string} reportId - Report identifier
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Cache TTL in seconds
   * @returns {Promise<any>}
   */
  async getOrFetch(reportId, fetchFn, ttl = this.defaultTTL) {
    const key = `report:${reportId}`;
    
    // Try cache first
    const cached = await this.get(key);
    if (cached) {
      console.log(`Cache HIT for report ${reportId}`);
      return cached;
    }

    // Cache miss - fetch data
    console.log(`Cache MISS for report ${reportId}`);
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Cache aggregated report data with long TTL
   * @param {string} framework - Compliance framework
   * @param {string} dateRange - Date range (e.g., '2024-01-01_2024-01-31')
   * @param {any} data - Aggregated data
   * @param {number} ttl - Cache TTL (default: 24 hours)
   */
  async cacheAggregation(framework, dateRange, data, ttl = 86400) {
    const key = `aggregation:${framework}:${dateRange}`;
    await this.set(key, data, ttl);
  }

  /**
   * Get cached aggregation
   * @param {string} framework - Compliance framework
   * @param {string} dateRange - Date range
   * @returns {Promise<any>}
   */
  async getAggregation(framework, dateRange) {
    const key = `aggregation:${framework}:${dateRange}`;
    return await this.get(key);
  }

  /**
   * Invalidate all report caches for a framework
   * @param {string} framework - Compliance framework
   */
  async invalidateFramework(framework) {
    const count = await this.delPattern(`aggregation:${framework}:*`);
    console.log(`Invalidated ${count} cache entries for framework ${framework}`);
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbsize();
      
      return {
        dbSize,
        info: info.split('\r\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key] = value;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.client.quit();
  }
}

module.exports = new CacheService();
