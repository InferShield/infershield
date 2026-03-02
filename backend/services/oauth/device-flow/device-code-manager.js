/**
 * Device Code Manager
 * 
 * Manages OAuth Device Authorization Grant flow (RFC 8628).
 * Handles device code generation, storage, and validation.
 * 
 * Flow:
 * 1. Client requests device code
 * 2. Server generates device_code + user_code + verification_uri
 * 3. User authenticates via browser
 * 4. Client polls for token
 * 5. Server returns tokens when authorized
 * 
 * Security:
 * - Device codes expire (default 15 minutes)
 * - User codes are human-readable and time-limited
 * - Polling rate-limited (slow_down response)
 * - Codes invalidated after use
 * 
 * Storage:
 * - In-memory Map (ephemeral, no persistence per passthrough architecture)
 * - Automatic expiry checking
 * - Periodic cleanup mechanism
 * 
 * @module oauth/device-flow/device-code-manager
 * @related Issue #1 - OAuth Device Flow (Task 2: Device Code Storage)
 */

/**
 * Device code state machine states
 */
const DeviceCodeState = {
  PENDING: 'pending',             // Waiting for user authorization
  AUTHORIZED: 'authorized',       // User authorized, ready for token exchange
  DENIED: 'denied',               // User denied authorization
  EXPIRED: 'expired',             // Device code expired
  CONSUMED: 'consumed'            // Token issued, code no longer valid
};

/**
 * Device Code Manager
 * 
 * Manages device authorization flow state and validation.
 * Provides clean API for storage operations with expiry checking.
 */
class DeviceCodeManager {
  constructor() {
    // In-memory storage (ephemeral)
    this._storage = new Map();
    
    // Cleanup interval (run every 5 minutes)
    this._cleanupInterval = null;
    this._cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
    
    // Start automatic cleanup
    this._startAutomaticCleanup();
  }

  /**
   * Store device code with associated data
   * 
   * @param {string} deviceCode - Unique device code
   * @param {Object} data - Device authorization data
   * @param {string} data.user_code - Human-readable user code
   * @param {string} data.client_id - OAuth client ID
   * @param {string} data.provider_id - Provider identifier
   * @param {string} data.scope - Requested scopes (space-separated)
   * @param {string} data.verification_uri - Provider authorization URL
   * @param {number} data.expires_in - Expiry time in seconds
   * @param {number} data.interval - Polling interval in seconds
   * @returns {void}
   */
  store(deviceCode, data) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be an object');
    }
    
    // Store with metadata
    this._storage.set(deviceCode, {
      ...data,
      device_code: deviceCode,
      created_at: Date.now(),
      state: DeviceCodeState.PENDING,
      poll_count: 0,
      last_polled_at: null
    });
  }

  /**
   * Retrieve device code data
   * 
   * Automatically checks expiry and returns null for expired codes.
   * 
   * @param {string} deviceCode - Device code to retrieve
   * @returns {Object|null} Device data or null if not found/expired
   */
  retrieve(deviceCode) {
    if (!deviceCode) {
      return null;
    }
    
    const data = this._storage.get(deviceCode);
    
    if (!data) {
      return null;
    }
    
    // Check expiry
    if (this._isExpired(data)) {
      // Mark as expired and return null
      data.state = DeviceCodeState.EXPIRED;
      this._storage.set(deviceCode, data);
      return null;
    }
    
    return data;
  }

  /**
   * Delete device code from storage
   * 
   * @param {string} deviceCode - Device code to delete
   * @returns {boolean} True if deleted, false if not found
   */
  delete(deviceCode) {
    if (!deviceCode) {
      return false;
    }
    
    return this._storage.delete(deviceCode);
  }

  /**
   * Update device code state
   * 
   * @param {string} deviceCode - Device code to update
   * @param {string} state - New state (from DeviceCodeState)
   * @param {Object} [additionalData] - Additional data to merge
   * @returns {boolean} True if updated, false if not found
   */
  updateState(deviceCode, state, additionalData = {}) {
    const data = this._storage.get(deviceCode);
    
    if (!data) {
      return false;
    }
    
    // Validate state
    if (!Object.values(DeviceCodeState).includes(state)) {
      throw new Error(`Invalid state: ${state}`);
    }
    
    // Update state
    data.state = state;
    data.updated_at = Date.now();
    
    // Merge additional data
    Object.assign(data, additionalData);
    
    this._storage.set(deviceCode, data);
    return true;
  }

  /**
   * Increment poll count for rate limiting
   * 
   * @param {string} deviceCode - Device code being polled
   * @returns {number|null} New poll count or null if not found
   */
  incrementPollCount(deviceCode) {
    const data = this._storage.get(deviceCode);
    
    if (!data) {
      return null;
    }
    
    data.poll_count = (data.poll_count || 0) + 1;
    data.last_polled_at = Date.now();
    
    this._storage.set(deviceCode, data);
    
    return data.poll_count;
  }

  /**
   * Get all device codes in a specific state
   * 
   * @param {string} state - State to filter by
   * @returns {Array<Object>} Array of device data objects
   */
  getByState(state) {
    const results = [];
    
    for (const [deviceCode, data] of this._storage.entries()) {
      if (data.state === state) {
        results.push(data);
      }
    }
    
    return results;
  }

  /**
   * Get device code by user code
   * 
   * @param {string} userCode - Human-readable user code
   * @returns {Object|null} Device data or null if not found
   */
  getByUserCode(userCode) {
    if (!userCode) {
      return null;
    }
    
    for (const [deviceCode, data] of this._storage.entries()) {
      if (data.user_code === userCode) {
        // Check expiry before returning
        return this.retrieve(deviceCode);
      }
    }
    
    return null;
  }

  /**
   * Check if device code has expired
   * 
   * @private
   * @param {Object} data - Device data with created_at and expires_in
   * @returns {boolean} True if expired
   */
  _isExpired(data) {
    if (!data || !data.created_at || !data.expires_in) {
      return true;
    }
    
    const expiresAt = data.created_at + (data.expires_in * 1000);
    return Date.now() > expiresAt;
  }

  /**
   * Clean up expired device codes
   * 
   * Removes all expired codes from storage.
   * Called automatically via periodic cleanup.
   * 
   * @returns {number} Number of codes cleaned up
   */
  cleanup() {
    let count = 0;
    
    for (const [deviceCode, data] of this._storage.entries()) {
      if (this._isExpired(data)) {
        this._storage.delete(deviceCode);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Start automatic cleanup of expired codes
   * 
   * @private
   */
  _startAutomaticCleanup() {
    // Clear existing interval if any
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    
    // Schedule periodic cleanup
    this._cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`[DeviceCodeManager] Cleaned up ${cleaned} expired device codes`);
      }
    }, this._cleanupIntervalMs);
    
    // Don't prevent Node.js from exiting
    this._cleanupInterval.unref();
  }

  /**
   * Stop automatic cleanup
   * 
   * @private
   */
  _stopAutomaticCleanup() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }

  /**
   * Get storage statistics
   * 
   * @returns {Object} Storage stats
   */
  getStats() {
    const stats = {
      total: 0,
      pending: 0,
      authorized: 0,
      denied: 0,
      expired: 0,
      consumed: 0
    };
    
    for (const [_, data] of this._storage.entries()) {
      stats.total++;
      stats[data.state] = (stats[data.state] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Clear all device codes (for testing)
   * 
   * @private
   */
  _clear() {
    this._storage.clear();
  }
}

// Export singleton instance
const instance = new DeviceCodeManager();

module.exports = instance;
module.exports.DeviceCodeState = DeviceCodeState;
module.exports.DeviceCodeManager = DeviceCodeManager; // For testing with new instances
