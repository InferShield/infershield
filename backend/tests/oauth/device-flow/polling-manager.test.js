/**
 * Polling Manager Tests
 * 
 * Unit tests for device flow polling and rate limiting.
 * Tests exponential backoff, rate limiting, and state management.
 * 
 * @related Issue #1 - OAuth Device Flow (Task 4: Token Polling)
 */

const { PollingManager, PollingError } = require('../../../services/oauth/device-flow/polling-manager');

describe('Polling Manager', () => {
  let pollingManager;

  beforeEach(() => {
    // Create fresh instance for each test
    pollingManager = new PollingManager();
  });

  afterEach(() => {
    // Clean up
    pollingManager._clearAll();
  });

  describe('initializePolling', () => {
    it('should initialize polling state with default interval', async () => {
      const deviceCode = 'test_device_123';
      
      await pollingManager.initializePolling(deviceCode);
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state).toBeTruthy();
      expect(state.interval).toBe(5); // Default INITIAL_INTERVAL
      expect(state.lastPollTime).toBeNull();
      expect(state.rapidPollCount).toBe(0);
    });

    it('should accept custom polling interval', async () => {
      const deviceCode = 'test_device_123';
      const customInterval = 10;
      
      await pollingManager.initializePolling(deviceCode, customInterval);
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBe(customInterval);
    });

    it('should accept any interval value without enforcing minimum', async () => {
      const deviceCode = 'test_device_123';
      
      await pollingManager.initializePolling(deviceCode, 2); // 2 seconds
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBe(2); // Should use provided value
    });

    it('should throw error for missing device code', async () => {
      await expect(
        pollingManager.initializePolling('')
      ).rejects.toThrow('Device code is required');
    });
  });

  describe('recordPoll', () => {
    it('should allow first poll immediately', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      const result = await pollingManager.recordPoll(deviceCode);
      
      expect(result.allowed).toBe(true);
      expect(result.interval).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should auto-initialize polling state if not present', async () => {
      const deviceCode = 'test_device_123';
      
      // Don't call initializePolling - should auto-initialize
      const result = await pollingManager.recordPoll(deviceCode);
      
      expect(result.allowed).toBe(true);
      const state = pollingManager.getPollingState(deviceCode);
      expect(state).toBeTruthy();
    });

    it('should enforce minimum interval between polls', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // First poll
      await pollingManager.recordPoll(deviceCode);
      
      // Immediate second poll (too soon)
      const result = await pollingManager.recordPoll(deviceCode);
      
      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PollingError.AUTHORIZATION_PENDING);
      expect(result.interval).toBe(5);
    });

    it('should allow poll after interval has elapsed', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode, 0.1); // 100ms for testing
      
      // First poll
      await pollingManager.recordPoll(deviceCode);
      
      // Wait for interval to elapse
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second poll should be allowed
      const result = await pollingManager.recordPoll(deviceCode);
      expect(result.allowed).toBe(true);
    });

    it('should return slow_down for rapid polling', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // First poll
      await pollingManager.recordPoll(deviceCode);
      
      // Make 3 rapid polls to trigger slow_down
      await pollingManager.recordPoll(deviceCode);
      await pollingManager.recordPoll(deviceCode);
      const result = await pollingManager.recordPoll(deviceCode);
      
      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PollingError.SLOW_DOWN);
      expect(result.interval).toBeGreaterThan(5); // Should have applied backoff
    });

    it('should reset rapid poll counter on valid poll', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode, 0.1);
      
      // First poll
      await pollingManager.recordPoll(deviceCode);
      
      // One rapid poll (increases counter)
      await pollingManager.recordPoll(deviceCode);
      
      // Wait and do valid poll (should reset counter)
      await new Promise(resolve => setTimeout(resolve, 150));
      await pollingManager.recordPoll(deviceCode);
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.rapidPollCount).toBe(0);
    });

    it('should throw error for missing device code', async () => {
      await expect(
        pollingManager.recordPoll('')
      ).rejects.toThrow('Device code is required');
    });
  });

  describe('applyBackoff', () => {
    it('should increase interval exponentially', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      const interval1 = await pollingManager.applyBackoff(deviceCode);
      expect(interval1).toBe(8); // 5 * 1.5 = 7.5, rounded up to 8
      
      const interval2 = await pollingManager.applyBackoff(deviceCode);
      expect(interval2).toBe(12); // 8 * 1.5 = 12
      
      const interval3 = await pollingManager.applyBackoff(deviceCode);
      expect(interval3).toBe(18); // 12 * 1.5 = 18
    });

    it('should cap interval at maximum (30 seconds)', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // Apply backoff multiple times
      for (let i = 0; i < 10; i++) {
        await pollingManager.applyBackoff(deviceCode);
      }
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBeLessThanOrEqual(30);
    });

    it('should throw error for missing device code', async () => {
      await expect(
        pollingManager.applyBackoff('')
      ).rejects.toThrow('Device code is required');
    });

    it('should throw error for non-existent device code', async () => {
      await expect(
        pollingManager.applyBackoff('non_existent')
      ).rejects.toThrow('No polling state found');
    });
  });

  describe('resetInterval', () => {
    it('should reset interval to default after backoff', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // Apply backoff
      await pollingManager.applyBackoff(deviceCode);
      await pollingManager.applyBackoff(deviceCode);
      
      let state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBeGreaterThan(5);
      
      // Reset interval
      await pollingManager.resetInterval(deviceCode);
      
      state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBe(5);
    });

    it('should reset rapid poll count', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // Trigger some rapid polls
      await pollingManager.recordPoll(deviceCode);
      await pollingManager.recordPoll(deviceCode);
      
      // Reset
      await pollingManager.resetInterval(deviceCode);
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.rapidPollCount).toBe(0);
    });

    it('should handle non-existent device code gracefully', async () => {
      // Should not throw
      await expect(
        pollingManager.resetInterval('non_existent')
      ).resolves.not.toThrow();
    });

    it('should throw error for missing device code', async () => {
      await expect(
        pollingManager.resetInterval('')
      ).rejects.toThrow('Device code is required');
    });
  });

  describe('cleanupPolling', () => {
    it('should remove polling state', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      expect(pollingManager.getPollingState(deviceCode)).toBeTruthy();
      
      await pollingManager.cleanupPolling(deviceCode);
      
      expect(pollingManager.getPollingState(deviceCode)).toBeNull();
    });

    it('should handle non-existent device code gracefully', async () => {
      // Should not throw
      await expect(
        pollingManager.cleanupPolling('non_existent')
      ).resolves.not.toThrow();
    });

    it('should throw error for missing device code', async () => {
      await expect(
        pollingManager.cleanupPolling('')
      ).rejects.toThrow('Device code is required');
    });
  });

  describe('getPollingState', () => {
    it('should return polling state for existing device code', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode, 10);
      
      const state = pollingManager.getPollingState(deviceCode);
      
      expect(state).toBeTruthy();
      expect(state.interval).toBe(10);
    });

    it('should return null for non-existent device code', () => {
      const state = pollingManager.getPollingState('non_existent');
      expect(state).toBeNull();
    });
  });

  describe('Integration: Complete polling flow', () => {
    it('should handle typical polling scenario', async () => {
      const deviceCode = 'test_device_123';
      
      // Initialize
      await pollingManager.initializePolling(deviceCode);
      
      // First poll - allowed
      let result = await pollingManager.recordPoll(deviceCode);
      expect(result.allowed).toBe(true);
      
      // Immediate second poll - rejected
      result = await pollingManager.recordPoll(deviceCode);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PollingError.AUTHORIZATION_PENDING);
      
      // Simulate authorization success and cleanup
      await pollingManager.resetInterval(deviceCode);
      await pollingManager.cleanupPolling(deviceCode);
      
      expect(pollingManager.getPollingState(deviceCode)).toBeNull();
    });

    it('should handle rapid polling with backoff', async () => {
      const deviceCode = 'test_device_123';
      await pollingManager.initializePolling(deviceCode);
      
      // First poll
      await pollingManager.recordPoll(deviceCode);
      
      // Trigger slow_down
      await pollingManager.recordPoll(deviceCode);
      await pollingManager.recordPoll(deviceCode);
      await pollingManager.recordPoll(deviceCode);
      
      const state = pollingManager.getPollingState(deviceCode);
      expect(state.interval).toBeGreaterThan(5);
      expect(state.interval).toBeLessThanOrEqual(30);
    });
  });
});
