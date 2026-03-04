/**
 * Redis Session Manager
 * 
 * Drop-in replacement for the in-memory SessionManager.
 * Provides Redis-backed session storage with:
 * - Automatic TTL management
 * - Session persistence across restarts
 * - Multi-instance session sharing
 * - Backward compatible API
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const RedisAdapter = require('./redisAdapter');
const redisConfig = require('../../config/redis');

class RedisSessionManager {
  constructor(options = {}) {
    this.options = {
      defaultTTL: options.defaultTTL || redisConfig.session.defaultTTL,
      cleanupInterval: options.cleanupInterval || redisConfig.session.cleanupInterval,
      maxSessions: options.maxSessions || 10000, // Higher limit for Redis
      keyPrefix: options.keyPrefix || redisConfig.session.prefix,
    };
    
    this.events = new EventEmitter();
    this.redis = new RedisAdapter(redisConfig);
    this.cleanupInterval = null;
    this.ready = false;
    
    // Wait for Redis to be ready
    this._initializeRedis();
  }
  
  async _initializeRedis() {
    this.redis.on('ready', () => {
      console.log('✅ RedisSessionManager ready');
      this.ready = true;
      this.events.emit('ready');
      
      // Start cleanup interval (optional with Redis TTL, but good for monitoring)
      if (this.options.cleanupInterval > 0) {
        this.cleanupInterval = setInterval(
          () => this._reportSessionMetrics(),
          this.options.cleanupInterval
        );
      }
    });
    
    this.redis.on('error', (error) => {
      console.error('❌ RedisSessionManager error:', error.message);
      this.events.emit('error', error);
    });
    
    this.redis.on('disconnected', () => {
      console.warn('⚠️  RedisSessionManager disconnected');
      this.ready = false;
      this.events.emit('disconnected');
    });
    
    this.redis.on('reconnecting', () => {
      console.log('🔄 RedisSessionManager reconnecting...');
      this.events.emit('reconnecting');
    });
  }
  
  /**
   * Generate Redis key for a session
   */
  _getKey(sessionId) {
    return `${this.options.keyPrefix}${sessionId}`;
  }
  
  /**
   * Create a new session
   * @param {string} sessionId - Unique session identifier
   * @param {object} data - Session data
   * @returns {Promise<void>}
   */
  async createSession(sessionId, data = {}) {
    if (!sessionId) {
      sessionId = uuidv4();
    }
    
    const key = this._getKey(sessionId);
    const ttlSeconds = Math.floor(this.options.defaultTTL / 1000);
    
    const sessionData = {
      sessionId,
      data,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.options.defaultTTL).toISOString(),
    };
    
    try {
      await this.redis.set(key, sessionData, ttlSeconds);
      this.events.emit('sessionCreated', { sessionId, data });
      return sessionId;
    } catch (error) {
      console.error(`Failed to create session ${sessionId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get session data
   * @param {string} sessionId - Session identifier
   * @returns {Promise<object|null>} Session data or null if not found/expired
   */
  async getSession(sessionId) {
    if (!sessionId) {
      return null;
    }
    
    const key = this._getKey(sessionId);
    
    try {
      const sessionData = await this.redis.get(key);
      
      if (!sessionData) {
        return null;
      }
      
      // Redis TTL handles expiration, but double-check for safety
      if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
        await this.redis.delete(key);
        return null;
      }
      
      return sessionData.data;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error.message);
      return null;
    }
  }
  
  /**
   * Update session data
   * @param {string} sessionId - Session identifier
   * @param {object} data - Updated session data
   * @returns {Promise<boolean>}
   */
  async updateSession(sessionId, data) {
    if (!sessionId) {
      return false;
    }
    
    const key = this._getKey(sessionId);
    
    try {
      // Get existing session to preserve metadata
      const existing = await this.redis.get(key);
      
      if (!existing) {
        return false;
      }
      
      // Update data while preserving createdAt
      const updatedSession = {
        ...existing,
        data: { ...existing.data, ...data },
        expiresAt: new Date(Date.now() + this.options.defaultTTL).toISOString(),
      };
      
      const ttlSeconds = Math.floor(this.options.defaultTTL / 1000);
      await this.redis.set(key, updatedSession, ttlSeconds);
      
      this.events.emit('sessionUpdated', { sessionId, data });
      return true;
    } catch (error) {
      console.error(`Failed to update session ${sessionId}:`, error.message);
      return false;
    }
  }
  
  /**
   * Delete a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionId) {
    if (!sessionId) {
      return false;
    }
    
    const key = this._getKey(sessionId);
    
    try {
      const deleted = await this.redis.delete(key);
      
      if (deleted) {
        this.events.emit('sessionDeleted', { sessionId });
      }
      
      return deleted;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error.message);
      return false;
    }
  }
  
  /**
   * Extend session TTL
   * @param {string} sessionId - Session identifier
   * @param {number} ttlMs - TTL in milliseconds
   * @returns {Promise<boolean>}
   */
  async extendSession(sessionId, ttlMs = null) {
    if (!sessionId) {
      return false;
    }
    
    const key = this._getKey(sessionId);
    const ttlSeconds = Math.floor((ttlMs || this.options.defaultTTL) / 1000);
    
    try {
      const result = await this.redis.expire(key, ttlSeconds);
      
      if (result) {
        // Update expiresAt in session data
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          sessionData.expiresAt = new Date(Date.now() + (ttlSeconds * 1000)).toISOString();
          await this.redis.set(key, sessionData, ttlSeconds);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to extend session ${sessionId}:`, error.message);
      return false;
    }
  }
  
  /**
   * Get all active session IDs (use with caution)
   * @returns {Promise<string[]>}
   */
  async getAllSessionIds() {
    try {
      const pattern = `${this.options.keyPrefix}*`;
      const keys = await this.redis.scan(pattern);
      
      // Remove prefix to get session IDs
      return keys.map(key => key.replace(this.options.keyPrefix, ''));
    } catch (error) {
      console.error('Failed to get all session IDs:', error.message);
      return [];
    }
  }
  
  /**
   * Get session count
   * @returns {Promise<number>}
   */
  async getSessionCount() {
    try {
      const sessionIds = await this.getAllSessionIds();
      return sessionIds.length;
    } catch (error) {
      console.error('Failed to get session count:', error.message);
      return 0;
    }
  }
  
  /**
   * Cleanup expired sessions (mostly for monitoring with Redis)
   * Redis handles TTL automatically, so this just reports metrics
   * @returns {Promise<number>}
   */
  async cleanupExpiredSessions() {
    // With Redis, TTL handles cleanup automatically
    // This method exists for API compatibility and monitoring
    try {
      const count = await this.getSessionCount();
      console.log(`📊 Active sessions: ${count}`);
      return 0; // No manual cleanup needed
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error.message);
      return 0;
    }
  }
  
  /**
   * Report session metrics (called by cleanup interval)
   */
  async _reportSessionMetrics() {
    try {
      const count = await this.getSessionCount();
      
      this.events.emit('metrics', {
        activeSessions: count,
        timestamp: new Date().toISOString(),
      });
      
      if (count > this.options.maxSessions * 0.8) {
        console.warn(`⚠️  Session count approaching limit: ${count}/${this.options.maxSessions}`);
      }
    } catch (error) {
      console.error('Failed to report session metrics:', error.message);
    }
  }
  
  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      return await this.redis.ping();
    } catch (error) {
      console.error('Health check failed:', error.message);
      return false;
    }
  }
  
  /**
   * Get connection status
   * @returns {boolean}
   */
  isReady() {
    return this.ready && this.redis.isConnected();
  }
  
  /**
   * Graceful cleanup
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    await this.redis.close();
    this.ready = false;
    
    console.log('✅ RedisSessionManager cleanup complete');
  }
}

module.exports = RedisSessionManager;
