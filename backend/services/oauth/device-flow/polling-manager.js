/**
 * Polling Manager
 * 
 * Manages OAuth Device Flow token polling with rate limiting and backoff.
 * Implements RFC 8628 polling best practices.
 * 
 * Features:
 * - Exponential backoff on repeated polls
 * - Rate limiting per device code
 * - Slow-down enforcement
 * - Concurrent poll prevention
 * 
 * @module oauth/device-flow/polling-manager
 * @related Issue #1 - OAuth Device Flow (Task 4: Token Polling)
 */

const INITIAL_INTERVAL = 5;      // 5 seconds default interval
const MAX_INTERVAL = 30;          // 30 seconds maximum interval (per requirements)
const BACKOFF_MULTIPLIER = 1.5;   // Exponential backoff factor
const SLOW_DOWN_THRESHOLD = 3;    // Apply slow_down after 3 rapid polls

/**
 * Polling error codes (RFC 8628)
 */
const PollingError = {
  AUTHORIZATION_PENDING: 'authorization_pending',
  SLOW_DOWN: 'slow_down',
  ACCESS_DENIED: 'access_denied',
  EXPIRED_TOKEN: 'expired_token'
};

/**
 * Polling Manager
 * 
 * Manages device flow token polling with rate limiting.
 * Uses in-memory Map for polling state tracking.
 */
class PollingManager {
  constructor() {
    // Polling state per device code
    // Map<deviceCode, { interval, lastPollTime, rapidPollCount }>
    this._pollingState = new Map();
  }

  /**
   * Initialize polling state for device code
   * 
   * @param {string} deviceCode - Device code to track
   * @param {number} interval - Initial polling interval in seconds
   * @returns {Promise<void>}
   */
  async initializePolling(deviceCode, interval = INITIAL_INTERVAL) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    this._pollingState.set(deviceCode, {
      interval: interval, // Use provided interval (no minimum for testing flexibility)
      lastPollTime: null,
      rapidPollCount: 0
    });
  }

  /**
   * Record polling attempt and check rate limits
   * 
   * Validates that:
   * - Minimum interval has elapsed since last poll
   * - Device code hasn't been polled too rapidly
   * 
   * @param {string} deviceCode - Device code being polled
   * @returns {Promise<Object>} Poll validation result
   * @returns {boolean} .allowed - Whether poll is allowed
   * @returns {number} .interval - Seconds to wait before next poll
   * @returns {string} [.error] - Error code if poll rejected
   */
  async recordPoll(deviceCode) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    // Get or create polling state
    let state = this._pollingState.get(deviceCode);
    if (!state) {
      // Initialize on first poll
      await this.initializePolling(deviceCode);
      state = this._pollingState.get(deviceCode);
    }

    const now = Date.now();
    const currentInterval = state.interval;

    // Check if minimum interval has elapsed
    if (state.lastPollTime) {
      const timeSinceLastPoll = (now - state.lastPollTime) / 1000; // Convert to seconds
      
      if (timeSinceLastPoll < currentInterval) {
        // Too soon! Client is polling too rapidly
        state.rapidPollCount++;
        this._pollingState.set(deviceCode, state); // Save updated count
        
        // Apply slow_down after threshold
        if (state.rapidPollCount >= SLOW_DOWN_THRESHOLD) {
          const newInterval = await this.applyBackoff(deviceCode);
          return {
            allowed: false,
            interval: newInterval,
            error: PollingError.SLOW_DOWN
          };
        }

        return {
          allowed: false,
          interval: currentInterval,
          error: PollingError.AUTHORIZATION_PENDING
        };
      }
    }

    // Poll is allowed - update state
    state.lastPollTime = now;
    state.rapidPollCount = 0; // Reset rapid poll counter on valid poll
    this._pollingState.set(deviceCode, state);

    return {
      allowed: true,
      interval: currentInterval
    };
  }

  /**
   * Apply exponential backoff to polling interval
   * 
   * Increases the polling interval exponentially with each call,
   * up to the maximum configured interval.
   * 
   * @param {string} deviceCode - Device code to adjust interval for
   * @returns {Promise<number>} New polling interval in seconds
   */
  async applyBackoff(deviceCode) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    const state = this._pollingState.get(deviceCode);
    if (!state) {
      throw new Error(`No polling state found for device code: ${deviceCode}`);
    }

    // Calculate new interval with exponential backoff
    const newInterval = Math.min(
      Math.ceil(state.interval * BACKOFF_MULTIPLIER),
      MAX_INTERVAL
    );

    state.interval = newInterval;
    this._pollingState.set(deviceCode, state);

    return newInterval;
  }

  /**
   * Reset polling interval (after successful authorization)
   * 
   * Resets the polling interval back to the default value.
   * Called when authorization completes successfully.
   * 
   * @param {string} deviceCode - Device code to reset
   * @returns {Promise<void>}
   */
  async resetInterval(deviceCode) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    const state = this._pollingState.get(deviceCode);
    if (state) {
      state.interval = INITIAL_INTERVAL;
      state.rapidPollCount = 0;
      this._pollingState.set(deviceCode, state);
    }
  }

  /**
   * Clean up polling state for device code
   * 
   * Removes all polling tracking data for the given device code.
   * Called when token is issued or device code expires.
   * 
   * @param {string} deviceCode - Device code to clean up
   * @returns {Promise<void>}
   */
  async cleanupPolling(deviceCode) {
    if (!deviceCode) {
      throw new Error('Device code is required');
    }

    this._pollingState.delete(deviceCode);
  }

  /**
   * Get current polling state for device code
   * 
   * @param {string} deviceCode - Device code to check
   * @returns {Object|null} Polling state or null if not found
   */
  getPollingState(deviceCode) {
    return this._pollingState.get(deviceCode) || null;
  }

  /**
   * Clear all polling state (for testing)
   * 
   * @private
   */
  _clearAll() {
    this._pollingState.clear();
  }
}

module.exports = new PollingManager();
module.exports.PollingError = PollingError;
module.exports.PollingManager = PollingManager; // Export class for testing
