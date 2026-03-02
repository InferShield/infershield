/**
 * Authorization Callback Handler Tests
 * 
 * Tests for POST /oauth/device/authorize endpoint
 * 
 * Validates:
 * - Authorization success flow (authorization_code received)
 * - Authorization failure flow (error received)
 * - User code validation
 * - State transitions (PENDING → AUTHORIZED/DENIED)
 * - Error handling (missing parameters, invalid states, etc.)
 * 
 * @related Issue #1, Task 9 - Authorization callback handler
 */

const request = require('supertest');
const express = require('express');
const deviceFlowRouter = require('../../../routes/oauth/device-flow');
const deviceCodeManager = require('../../../services/oauth/device-flow/device-code-manager');
const { DeviceCodeState } = deviceCodeManager;

describe('POST /oauth/device/authorize - Authorization Callback', () => {
  let app;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/oauth', deviceFlowRouter);

    // Clear device code storage
    deviceCodeManager._clear();
  });

  afterEach(() => {
    // Clean up
    deviceCodeManager._clear();
  });

  // ==================== SUCCESS FLOW ====================

  describe('Authorization Success', () => {
    it('should process successful authorization and update state to AUTHORIZED', async () => {
      // Setup: Store a pending device code
      const deviceCode = 'test_device_code_123';
      const userCode = 'ABCD-1234';
      const authCode = 'provider_auth_code_xyz';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'read write',
        verification_uri: 'https://provider.com/verify',
        expires_in: 900,
        interval: 5
      });

      // Execute: Send authorization callback
      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: authCode,
          state: 'optional_state_param'
        })
        .expect(200);

      // Verify response
      expect(response.body).toEqual({
        success: true,
        message: 'Authorization processed successfully'
      });

      // Verify device code state updated to AUTHORIZED
      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(deviceData.authorization_code).toBe(authCode);
      expect(deviceData.state_param).toBe('optional_state_param');
      expect(deviceData.authorized_at).toBeDefined();
      expect(typeof deviceData.authorized_at).toBe('number');
    });

    it('should store authorization code in device data', async () => {
      const deviceCode = 'device_123';
      const userCode = 'USER-CODE';
      const authCode = 'auth_code_abc';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client_1',
        provider_id: 'copilot',
        scope: 'api',
        verification_uri: 'https://provider.com/verify',
        expires_in: 600,
        interval: 5
      });

      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: authCode
        })
        .expect(200);

      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.authorization_code).toBe(authCode);
    });

    it('should handle authorization without optional state parameter', async () => {
      const deviceCode = 'device_no_state';
      const userCode = 'CODE-1234';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'test',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 300,
        interval: 5
      });

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(deviceData.state_param).toBeUndefined();
    });
  });

  // ==================== FAILURE FLOW ====================

  describe('Authorization Failure (User Denial)', () => {
    it('should handle user denial and update state to DENIED', async () => {
      const deviceCode = 'device_denied';
      const userCode = 'DENY-CODE';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          error: 'access_denied',
          error_description: 'User denied authorization'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Authorization denied',
        reason: 'User denied authorization'
      });

      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.DENIED);
      expect(deviceData.denied_reason).toBe('User denied authorization');
      expect(deviceData.denied_at).toBeDefined();
    });

    it('should handle error without description', async () => {
      const deviceCode = 'device_error_no_desc';
      const userCode = 'ERROR-1234';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          error: 'server_error'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reason).toBe('server_error');

      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.DENIED);
      expect(deviceData.denied_reason).toBe('server_error');
    });
  });

  // ==================== VALIDATION ====================

  describe('Request Validation', () => {
    it('should require user_code parameter', async () => {
      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          authorization_code: 'auth_code_123'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'invalid_request',
        error_description: 'user_code is required'
      });
    });

    it('should reject invalid/expired user_code', async () => {
      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: 'INVALID-CODE',
          authorization_code: 'auth_123'
        })
        .expect(404);

      expect(response.body).toEqual({
        error: 'invalid_user_code',
        error_description: 'User code not found or expired'
      });
    });

    it('should require authorization_code when no error present', async () => {
      const deviceCode = 'device_no_auth_code';
      const userCode = 'VALID-CODE';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode
          // Missing both authorization_code and error
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'invalid_request',
        error_description: 'authorization_code is required when error is not present'
      });
    });

    it('should reject authorization for non-PENDING device code', async () => {
      const deviceCode = 'device_already_authorized';
      const userCode = 'USED-CODE';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      // Manually set state to AUTHORIZED
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_123'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_state');
      expect(response.body.error_description).toContain('authorized');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle expired device code', async () => {
      const deviceCode = 'expired_device';
      const userCode = 'EXPIRED-CODE';

      // Store with 0 second expiry (immediately expired)
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 0, // Expired immediately
        interval: 5
      });

      // Wait a tiny bit to ensure expiry
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_123'
        })
        .expect(404);

      expect(response.body.error).toBe('invalid_user_code');
      expect(response.body.error_description).toContain('expired');
    });

    it('should handle concurrent authorization attempts gracefully', async () => {
      const deviceCode = 'concurrent_device';
      const userCode = 'CONCURRENT-CODE';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      // First authorization should succeed
      const response1 = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_first'
        })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Second authorization should fail (already authorized)
      const response2 = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_second'
        })
        .expect(400);

      expect(response2.body.error).toBe('invalid_state');
    });

    it('should preserve existing device code data when updating', async () => {
      const deviceCode = 'preserve_data';
      const userCode = 'PRESERVE-CODE';
      const originalData = {
        user_code: userCode,
        client_id: 'original_client',
        provider_id: 'original_provider',
        scope: 'read write delete',
        verification_uri: 'https://original.com/verify',
        expires_in: 900,
        interval: 10
      };

      deviceCodeManager.store(deviceCode, originalData);

      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_preserve'
        })
        .expect(200);

      const deviceData = deviceCodeManager.retrieve(deviceCode);
      
      // Original data should be preserved
      expect(deviceData.client_id).toBe(originalData.client_id);
      expect(deviceData.provider_id).toBe(originalData.provider_id);
      expect(deviceData.scope).toBe(originalData.scope);
      expect(deviceData.verification_uri).toBe(originalData.verification_uri);
      
      // New data should be added
      expect(deviceData.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(deviceData.authorization_code).toBe('auth_preserve');
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/oauth/device/authorize')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express's built-in JSON parser handles this
      expect(response.body).toBeDefined();
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/oauth/device/authorize')
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
    });

    it('should return 500 for internal errors', async () => {
      const deviceCode = 'error_device';
      const userCode = 'ERROR-CODE';

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      // Mock updateState to throw error
      const originalUpdateState = deviceCodeManager.updateState;
      deviceCodeManager.updateState = jest.fn(() => {
        throw new Error('Simulated internal error');
      });

      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_123'
        })
        .expect(500);

      expect(response.body.error).toBe('server_error');
      expect(response.body.error_description).toContain('Simulated internal error');

      // Restore original method
      deviceCodeManager.updateState = originalUpdateState;
    });
  });

  // ==================== INTEGRATION ====================

  describe('Integration with Device Code Manager', () => {
    it('should correctly use getByUserCode to find device', async () => {
      const deviceCode1 = 'device_1';
      const deviceCode2 = 'device_2';
      const userCode1 = 'CODE-1111';
      const userCode2 = 'CODE-2222';

      deviceCodeManager.store(deviceCode1, {
        user_code: userCode1,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      deviceCodeManager.store(deviceCode2, {
        user_code: userCode2,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      // Authorize first device
      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode1,
          authorization_code: 'auth_1'
        })
        .expect(200);

      // Verify only first device is authorized
      const device1 = deviceCodeManager.retrieve(deviceCode1);
      const device2 = deviceCodeManager.retrieve(deviceCode2);

      expect(device1.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(device2.state).toBe(DeviceCodeState.PENDING);
    });

    it('should update timestamp fields correctly', async () => {
      const deviceCode = 'timestamp_device';
      const userCode = 'TIME-CODE';

      const beforeTime = Date.now();

      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'client',
        provider_id: 'provider',
        scope: 'read',
        verification_uri: 'https://test.com/verify',
        expires_in: 600,
        interval: 5
      });

      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'auth_time'
        })
        .expect(200);

      const afterTime = Date.now();
      const deviceData = deviceCodeManager.retrieve(deviceCode);

      expect(deviceData.authorized_at).toBeGreaterThanOrEqual(beforeTime);
      expect(deviceData.authorized_at).toBeLessThanOrEqual(afterTime);
      expect(deviceData.updated_at).toBeDefined();
    });
  });
});
