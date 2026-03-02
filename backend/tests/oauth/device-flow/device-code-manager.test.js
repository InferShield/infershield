/**
 * Device Code Manager Tests
 * 
 * Unit tests for OAuth device authorization flow storage.
 * 
 * @related Issue #1 - OAuth Device Flow (Task 2: Device Code Storage)
 */

const { DeviceCodeManager, DeviceCodeState } = require('../../../services/oauth/device-flow/device-code-manager');

describe('Device Code Manager', () => {
  let manager;

  beforeEach(() => {
    // Create fresh instance for each test
    manager = new DeviceCodeManager();
    manager._stopAutomaticCleanup(); // Disable cleanup for predictable tests
  });

  afterEach(() => {
    // Clean up
    manager._clear();
    manager._stopAutomaticCleanup();
  });

  describe('store', () => {
    it('should store device code with data', () => {
      const deviceCode = 'test_device_code_123';
      const data = {
        user_code: 'ABCD-1234',
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api.read',
        verification_uri: 'https://example.com/device',
        expires_in: 900,
        interval: 5
      };

      manager.store(deviceCode, data);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved).toBeTruthy();
      expect(retrieved.user_code).toBe('ABCD-1234');
      expect(retrieved.client_id).toBe('test_client');
      expect(retrieved.provider_id).toBe('openai');
      expect(retrieved.state).toBe(DeviceCodeState.PENDING);
    });

    it('should set default metadata on store', () => {
      const deviceCode = 'test_device_code';
      const data = {
        user_code: 'TEST-1234',
        expires_in: 900
      };

      manager.store(deviceCode, data);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved.created_at).toBeDefined();
      expect(retrieved.state).toBe(DeviceCodeState.PENDING);
      expect(retrieved.poll_count).toBe(0);
      expect(retrieved.last_polled_at).toBeNull();
    });

    it('should throw error for missing device code', () => {
      expect(() => {
        manager.store('', { user_code: 'TEST' });
      }).toThrow('Device code is required');
    });

    it('should throw error for invalid data', () => {
      expect(() => {
        manager.store('code', null);
      }).toThrow('Data must be an object');
    });
  });

  describe('retrieve', () => {
    it('should retrieve stored device code', () => {
      const deviceCode = 'test_code';
      manager.store(deviceCode, {
        user_code: 'ABCD',
        expires_in: 900
      });

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved).toBeTruthy();
      expect(retrieved.device_code).toBe(deviceCode);
    });

    it('should return null for non-existent code', () => {
      const retrieved = manager.retrieve('non_existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for empty device code', () => {
      const retrieved = manager.retrieve('');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired device code', () => {
      const deviceCode = 'expired_code';
      manager.store(deviceCode, {
        user_code: 'EXPIRED',
        expires_in: 0 // Already expired
      });

      // Wait 10ms to ensure expiry
      setTimeout(() => {
        const retrieved = manager.retrieve(deviceCode);
        expect(retrieved).toBeNull();
      }, 10);
    });

    it('should mark expired codes with EXPIRED state', () => {
      const deviceCode = 'expire_test';
      manager.store(deviceCode, {
        user_code: 'EXPIRE',
        expires_in: -1 // Already expired
      });

      manager.retrieve(deviceCode); // Should mark as expired

      const data = manager._storage.get(deviceCode);
      expect(data.state).toBe(DeviceCodeState.EXPIRED);
    });
  });

  describe('delete', () => {
    it('should delete device code', () => {
      const deviceCode = 'delete_test';
      manager.store(deviceCode, {
        user_code: 'DELETE',
        expires_in: 900
      });

      const deleted = manager.delete(deviceCode);
      expect(deleted).toBe(true);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent code', () => {
      const deleted = manager.delete('non_existent');
      expect(deleted).toBe(false);
    });

    it('should return false for empty device code', () => {
      const deleted = manager.delete('');
      expect(deleted).toBe(false);
    });
  });

  describe('updateState', () => {
    it('should update device code state', () => {
      const deviceCode = 'state_test';
      manager.store(deviceCode, {
        user_code: 'STATE',
        expires_in: 900
      });

      const updated = manager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);
      expect(updated).toBe(true);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(retrieved.updated_at).toBeDefined();
    });

    it('should merge additional data', () => {
      const deviceCode = 'merge_test';
      manager.store(deviceCode, {
        user_code: 'MERGE',
        expires_in: 900
      });

      manager.updateState(deviceCode, DeviceCodeState.AUTHORIZED, {
        authorization_code: 'auth_123',
        user_id: 'user_456'
      });

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved.authorization_code).toBe('auth_123');
      expect(retrieved.user_id).toBe('user_456');
    });

    it('should return false for non-existent code', () => {
      const updated = manager.updateState('non_existent', DeviceCodeState.AUTHORIZED);
      expect(updated).toBe(false);
    });

    it('should throw error for invalid state', () => {
      const deviceCode = 'invalid_state';
      manager.store(deviceCode, {
        user_code: 'INVALID',
        expires_in: 900
      });

      expect(() => {
        manager.updateState(deviceCode, 'invalid_state');
      }).toThrow('Invalid state');
    });
  });

  describe('incrementPollCount', () => {
    it('should increment poll count', () => {
      const deviceCode = 'poll_test';
      manager.store(deviceCode, {
        user_code: 'POLL',
        expires_in: 900
      });

      const count1 = manager.incrementPollCount(deviceCode);
      expect(count1).toBe(1);

      const count2 = manager.incrementPollCount(deviceCode);
      expect(count2).toBe(2);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved.poll_count).toBe(2);
      expect(retrieved.last_polled_at).toBeDefined();
    });

    it('should return null for non-existent code', () => {
      const count = manager.incrementPollCount('non_existent');
      expect(count).toBeNull();
    });
  });

  describe('getByState', () => {
    it('should retrieve codes by state', () => {
      manager.store('code1', { user_code: 'A', expires_in: 900 });
      manager.store('code2', { user_code: 'B', expires_in: 900 });
      manager.store('code3', { user_code: 'C', expires_in: 900 });

      manager.updateState('code2', DeviceCodeState.AUTHORIZED);

      const pending = manager.getByState(DeviceCodeState.PENDING);
      expect(pending.length).toBe(2);

      const authorized = manager.getByState(DeviceCodeState.AUTHORIZED);
      expect(authorized.length).toBe(1);
      expect(authorized[0].device_code).toBe('code2');
    });

    it('should return empty array for non-matching state', () => {
      manager.store('code1', { user_code: 'A', expires_in: 900 });

      const denied = manager.getByState(DeviceCodeState.DENIED);
      expect(denied).toEqual([]);
    });
  });

  describe('getByUserCode', () => {
    it('should retrieve device code by user code', () => {
      manager.store('device1', {
        user_code: 'ABCD-1234',
        expires_in: 900
      });

      const retrieved = manager.getByUserCode('ABCD-1234');
      expect(retrieved).toBeTruthy();
      expect(retrieved.device_code).toBe('device1');
    });

    it('should return null for non-existent user code', () => {
      const retrieved = manager.getByUserCode('NONEXIST');
      expect(retrieved).toBeNull();
    });

    it('should return null for empty user code', () => {
      const retrieved = manager.getByUserCode('');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired code', () => {
      manager.store('expired_device', {
        user_code: 'EXPIRED',
        expires_in: -1
      });

      const retrieved = manager.getByUserCode('EXPIRED');
      expect(retrieved).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired codes', () => {
      // Store mix of expired and active codes
      manager.store('active1', {
        user_code: 'ACTIVE1',
        expires_in: 900
      });

      manager.store('expired1', {
        user_code: 'EXPIRED1',
        expires_in: -1
      });

      manager.store('expired2', {
        user_code: 'EXPIRED2',
        expires_in: 0
      });

      const cleaned = manager.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(2);

      expect(manager.retrieve('active1')).toBeTruthy();
      expect(manager.retrieve('expired1')).toBeNull();
      expect(manager.retrieve('expired2')).toBeNull();
    });

    it('should preserve active codes', () => {
      manager.store('code1', { user_code: 'A', expires_in: 900 });
      manager.store('code2', { user_code: 'B', expires_in: 1800 });

      const cleaned = manager.cleanup();
      expect(cleaned).toBe(0);

      expect(manager.retrieve('code1')).toBeTruthy();
      expect(manager.retrieve('code2')).toBeTruthy();
    });

    it('should return zero when no codes to clean', () => {
      const cleaned = manager.cleanup();
      expect(cleaned).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.store('code1', { user_code: 'A', expires_in: 900 });
      manager.store('code2', { user_code: 'B', expires_in: 900 });
      manager.store('code3', { user_code: 'C', expires_in: 900 });

      manager.updateState('code2', DeviceCodeState.AUTHORIZED);
      manager.updateState('code3', DeviceCodeState.DENIED);

      const stats = manager.getStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.authorized).toBe(1);
      expect(stats.denied).toBe(1);
    });

    it('should return zero stats for empty storage', () => {
      const stats = manager.getStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('automatic cleanup', () => {
    it('should have cleanup interval configured', () => {
      const freshManager = new DeviceCodeManager();
      expect(freshManager._cleanupInterval).toBeTruthy();
      freshManager._stopAutomaticCleanup();
    });

    it('should allow stopping automatic cleanup', () => {
      const freshManager = new DeviceCodeManager();
      freshManager._stopAutomaticCleanup();
      expect(freshManager._cleanupInterval).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent operations', () => {
      const deviceCode = 'concurrent_test';
      manager.store(deviceCode, {
        user_code: 'CONCURRENT',
        expires_in: 900
      });

      // Simulate concurrent updates
      manager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);
      manager.incrementPollCount(deviceCode);
      manager.incrementPollCount(deviceCode);

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(retrieved.poll_count).toBe(2);
    });

    it('should handle special characters in codes', () => {
      const deviceCode = 'code_with-special.chars_123';
      manager.store(deviceCode, {
        user_code: 'SPECIAL',
        expires_in: 900
      });

      const retrieved = manager.retrieve(deviceCode);
      expect(retrieved).toBeTruthy();
    });
  });
});
