/**
 * Redis Adapter
 * 
 * Provides a robust Redis client with:
 * - Connection pooling
 * - Automatic reconnection
 * - Health checks
 * - Error handling
 * - Graceful degradation
 */

const Redis = require('ioredis');
const EventEmitter = require('events');

class RedisAdapter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.connected = false;
    this.reconnecting = false;
    
    this._initializeClient();
  }
  
  _initializeClient() {
    console.log('🔌 Initializing Redis connection...');
    console.log(`   Host: ${this.config.host}:${this.config.port}`);
    console.log(`   DB: ${this.config.db}`);
    console.log(`   TLS: ${this.config.tls ? 'enabled' : 'disabled'}`);
    
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      tls: this.config.tls,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      enableOfflineQueue: this.config.enableOfflineQueue,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      retryStrategy: this.config.retryStrategy,
      lazyConnect: false, // Connect immediately
    });
    
    this._attachEventHandlers();
  }
  
  _attachEventHandlers() {
    this.client.on('connect', () => {
      console.log('✅ Redis connected');
      this.connected = true;
      this.reconnecting = false;
      this.emit('connected');
    });
    
    this.client.on('ready', () => {
      console.log('✅ Redis ready');
      this.emit('ready');
    });
    
    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
      this.emit('error', error);
    });
    
    this.client.on('close', () => {
      console.warn('⚠️  Redis connection closed');
      this.connected = false;
      this.emit('disconnected');
    });
    
    this.client.on('reconnecting', (delay) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
      this.reconnecting = true;
      this.emit('reconnecting', delay);
    });
    
    this.client.on('end', () => {
      console.warn('🔌 Redis connection ended');
      this.connected = false;
      this.emit('end');
    });
  }
  
  /**
   * Get a key from Redis
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Set a key in Redis with optional TTL
   */
  async set(key, value, ttlSeconds = null) {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Delete a key from Redis
   */
  async delete(key) {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Check if a key exists
   */
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Set TTL on an existing key
   */
  async expire(key, ttlSeconds) {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get remaining TTL for a key
   */
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get all keys matching a pattern (use with caution in production)
   */
  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Scan keys matching a pattern (production-safe alternative to KEYS)
   */
  async scan(pattern, count = 100) {
    const keys = [];
    let cursor = '0';
    
    try {
      do {
        const [nextCursor, results] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          count
        );
        cursor = nextCursor;
        keys.push(...results);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      console.error(`Redis SCAN error for pattern ${pattern}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Increment a counter
   */
  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Execute a pipeline of commands
   */
  async pipeline(commands) {
    try {
      const pipeline = this.client.pipeline();
      commands.forEach(([cmd, ...args]) => pipeline[cmd](...args));
      return await pipeline.exec();
    } catch (error) {
      console.error('Redis PIPELINE error:', error.message);
      throw error;
    }
  }
  
  /**
   * Health check
   */
  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error.message);
      return false;
    }
  }
  
  /**
   * Get Redis info
   */
  async info(section = null) {
    try {
      return await this.client.info(section);
    } catch (error) {
      console.error('Redis INFO error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get connection status
   */
  isConnected() {
    return this.connected && this.client.status === 'ready';
  }
  
  /**
   * Gracefully close the connection
   */
  async close() {
    if (this.client) {
      console.log('🔌 Closing Redis connection...');
      await this.client.quit();
      this.connected = false;
    }
  }
  
  /**
   * Force close the connection (for emergencies)
   */
  async disconnect() {
    if (this.client) {
      console.log('⚠️  Force disconnecting Redis...');
      this.client.disconnect();
      this.connected = false;
    }
  }
}

module.exports = RedisAdapter;
