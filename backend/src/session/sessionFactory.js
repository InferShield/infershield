/**
 * Session Factory
 * 
 * Factory pattern for creating session managers with:
 * - Feature flag support (Redis vs in-memory)
 * - Graceful fallback
 * - Environment-based configuration
 */

const redisConfig = require('../../config/redis');

class SessionFactory {
  /**
   * Create a session manager based on configuration
   * @param {object} options - Session manager options
   * @returns {SessionManager|RedisSessionManager}
   */
  static create(options = {}) {
    const useRedis = redisConfig.enabled;
    const fallbackToMemory = redisConfig.fallbackToMemory;
    
    console.log('🏭 SessionFactory creating session manager...');
    console.log(`   Redis enabled: ${useRedis}`);
    console.log(`   Fallback to memory: ${fallbackToMemory}`);
    
    if (useRedis) {
      try {
        const RedisSessionManager = require('./redisSessionManager');
        const manager = new RedisSessionManager(options);
        
        // If fallback is enabled, handle Redis connection failures
        if (fallbackToMemory) {
          manager.redis.on('error', (error) => {
            console.error('⚠️  Redis connection failed, consider fallback:', error.message);
          });
        }
        
        console.log('✅ Using RedisSessionManager');
        return manager;
      } catch (error) {
        console.error('❌ Failed to initialize RedisSessionManager:', error.message);
        
        if (fallbackToMemory) {
          console.warn('⚠️  Falling back to in-memory SessionManager');
          const SessionManager = require('./sessionManager');
          return new SessionManager(options);
        } else {
          throw error;
        }
      }
    } else {
      console.log('✅ Using in-memory SessionManager');
      const SessionManager = require('./sessionManager');
      return new SessionManager(options);
    }
  }
  
  /**
   * Create Redis session manager explicitly
   * @param {object} options - Session manager options
   * @returns {RedisSessionManager}
   */
  static createRedis(options = {}) {
    const RedisSessionManager = require('./redisSessionManager');
    return new RedisSessionManager(options);
  }
  
  /**
   * Create in-memory session manager explicitly
   * @param {object} options - Session manager options
   * @returns {SessionManager}
   */
  static createMemory(options = {}) {
    const SessionManager = require('./sessionManager');
    return new SessionManager(options);
  }
}

module.exports = SessionFactory;
