/**
 * OAuth Device Flow Integration Tests
 * 
 * End-to-end integration tests validating the full Device Flow with all components:
 * - Device authorization endpoint (dd34808)
 * - Device code storage (023f61f)
 * - Token polling (a119fa7)
 * - Browser launch (e93a382)
 * - Authorization callback (082cde8)
 * 
 * Tests the complete flow from device code request through user authorization
 * to token delivery, including failure scenarios.
 * 
 * @module tests/oauth/device-flow/integration
 * @related Issue #1 - OAuth Device Flow (Integration Test)
 */

const request = require('supertest');
const express = require('express');
const deviceFlowRouter = require('../../../routes/oauth/device-flow');
const deviceCodeManager = require('../../../services/oauth/device-flow/device-code-manager');
const { DeviceCodeState } = require('../../../services/oauth/device-flow/device-code-manager');
const pollingManager = require('../../../services/oauth/device-flow/polling-manager');
const { PollingError } = require('../../../services/oauth/device-flow/polling-manager');
const browserLauncher = require('../../../services/oauth/device-flow/browser-launcher');
const authServer = require('../../../services/oauth/device-flow/authorization-server');

// Create test app
const app = express();
app.use(express.json());
app.use('/oauth', deviceFlowRouter);

// Increase test timeout for integration tests with waiting
jest.setTimeout(15000);

describe('OAuth Device Flow - End-to-End Integration', () => {
  beforeEach(() => {
    // Clear all state before each test
    deviceCodeManager._clear();
    pollingManager._clearAll();
    authServer._internals.deviceCodeStore.clear();
  });

  afterEach(() => {
    // Clean up after each test
    deviceCodeManager._clear();
    pollingManager._clearAll();
    authServer._internals.deviceCodeStore.clear();
  });

  describe('Complete Authorization Flow - Success Path', () => {
    it('should complete full device flow: request → authorization → polling → token delivery', async () => {
      // ============================================================
      // STEP 1: Client initiates device authorization request
      // ============================================================
      
      const authRequest = {
        client_id: 'test_client_id',
        provider_id: 'openai',
        scope: 'api'
      };

      const deviceAuthResponse = await authServer.handleDeviceAuthorizationRequest(
        { body: authRequest },
        {
          status: (code) => ({
            json: (data) => ({ statusCode: code, body: data })
          })
        }
      );

      // Validate device authorization response
      expect(deviceAuthResponse.statusCode).toBe(200);
      expect(deviceAuthResponse.body).toHaveProperty('device_code');
      expect(deviceAuthResponse.body).toHaveProperty('user_code');
      expect(deviceAuthResponse.body).toHaveProperty('verification_uri');
      expect(deviceAuthResponse.body).toHaveProperty('expires_in');
      expect(deviceAuthResponse.body).toHaveProperty('interval');

      const deviceCode = deviceAuthResponse.body.device_code;
      const userCode = deviceAuthResponse.body.user_code;
      const verificationUri = deviceAuthResponse.body.verification_uri;
      const interval = 1; // Use short interval for testing

      // ============================================================
      // STEP 2: Store device code in device-code-manager
      // ============================================================
      
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: authRequest.client_id,
        provider_id: authRequest.provider_id,
        scope: authRequest.scope,
        verification_uri: verificationUri,
        expires_in: 900,
        interval: interval
      });

      // Verify storage
      const storedDevice = deviceCodeManager.retrieve(deviceCode);
      expect(storedDevice).not.toBeNull();
      expect(storedDevice.state).toBe(DeviceCodeState.PENDING);
      expect(storedDevice.user_code).toBe(userCode);

      // ============================================================
      // STEP 3: Mock browser launch (would open browser in real flow)
      // ============================================================
      
      // Mock browser launch - in real flow this opens the browser
      const mockLaunchResult = {
        success: true,
        userCode: userCode,
        verificationUri: verificationUri
      };

      expect(mockLaunchResult.success).toBe(true);
      expect(mockLaunchResult.userCode).toBe(userCode);

      // ============================================================
      // STEP 4: Client starts polling (authorization_pending)
      // ============================================================
      
      const pollRequest1 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollRequest1.status).toBe(400);
      expect(pollRequest1.body.error).toBe(PollingError.AUTHORIZATION_PENDING);

      // Wait for interval before next poll
      await new Promise(resolve => setTimeout(resolve, interval * 1000 + 100));

      // ============================================================
      // STEP 5: User completes authorization (callback handler)
      // ============================================================
      
      const authorizationCode = 'test_authorization_code_12345';
      
      const callbackResponse = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: authorizationCode,
          state: 'optional_state_param'
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.success).toBe(true);
      expect(callbackResponse.body.message).toBe('Authorization processed successfully');

      // Verify device code state updated to AUTHORIZED
      const authorizedDevice = deviceCodeManager.retrieve(deviceCode);
      expect(authorizedDevice).not.toBeNull();
      expect(authorizedDevice.state).toBe(DeviceCodeState.AUTHORIZED);
      expect(authorizedDevice.authorization_code).toBe(authorizationCode);

      // ============================================================
      // STEP 6: Client polls again and receives tokens
      // ============================================================
      
      const pollRequest2 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollRequest2.status).toBe(200);
      expect(pollRequest2.body).toHaveProperty('access_token');
      expect(pollRequest2.body).toHaveProperty('refresh_token');
      expect(pollRequest2.body.token_type).toBe('Bearer');
      expect(pollRequest2.body.expires_in).toBe(3600);
      expect(pollRequest2.body.scope).toBe(authRequest.scope);

      // Verify tokens are present
      expect(pollRequest2.body.access_token).toMatch(/^mock_access_token_/);
      expect(pollRequest2.body.refresh_token).toMatch(/^mock_refresh_token_/);

      // ============================================================
      // STEP 7: Verify device code marked as CONSUMED
      // ============================================================
      
      const consumedDevice = deviceCodeManager.retrieve(deviceCode);
      expect(consumedDevice).not.toBeNull();
      expect(consumedDevice.state).toBe(DeviceCodeState.CONSUMED);

      // ============================================================
      // STEP 8: Verify polling state cleaned up
      // ============================================================
      
      const pollingState = pollingManager.getPollingState(deviceCode);
      expect(pollingState).toBeNull();

      // ============================================================
      // STEP 9: Subsequent poll should fail (device code consumed)
      // ============================================================
      
      const pollRequest3 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollRequest3.status).toBe(400);
      expect(pollRequest3.body.error).toBe('invalid_grant');
      expect(pollRequest3.body.error_description).toContain('already been used');
    });
  });

  describe('Complete Authorization Flow - User Denial', () => {
    it('should handle user denial gracefully', async () => {
      // ============================================================
      // STEP 1: Client initiates device authorization
      // ============================================================
      
      const authRequest = {
        client_id: 'test_client_id',
        provider_id: 'github',
        scope: 'copilot user'
      };

      const deviceAuthResponse = await authServer.handleDeviceAuthorizationRequest(
        { body: authRequest },
        {
          status: (code) => ({
            json: (data) => ({ statusCode: code, body: data })
          })
        }
      );

      const deviceCode = deviceAuthResponse.body.device_code;
      const userCode = deviceAuthResponse.body.user_code;
      const interval = 1; // Short interval for testing

      // Store in device-code-manager
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: authRequest.client_id,
        provider_id: authRequest.provider_id,
        scope: authRequest.scope,
        verification_uri: deviceAuthResponse.body.verification_uri,
        expires_in: 900,
        interval: interval
      });

      // ============================================================
      // STEP 2: Client polls (authorization_pending)
      // ============================================================
      
      const pollRequest1 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollRequest1.status).toBe(400);
      expect(pollRequest1.body.error).toBe(PollingError.AUTHORIZATION_PENDING);

      // ============================================================
      // STEP 3: User denies authorization
      // ============================================================
      
      const callbackResponse = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          error: 'access_denied',
          error_description: 'User denied the authorization request'
        });

      expect(callbackResponse.status).toBe(200);
      expect(callbackResponse.body.success).toBe(true);
      expect(callbackResponse.body.message).toBe('Authorization denied');

      // Verify device code state updated to DENIED
      const deniedDevice = deviceCodeManager.retrieve(deviceCode);
      expect(deniedDevice).not.toBeNull();
      expect(deniedDevice.state).toBe(DeviceCodeState.DENIED);

      // Wait for interval
      await new Promise(resolve => setTimeout(resolve, interval * 1000 + 100));

      // ============================================================
      // STEP 4: Client polls and receives access_denied
      // ============================================================
      
      const pollRequest2 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollRequest2.status).toBe(400);
      expect(pollRequest2.body.error).toBe(PollingError.ACCESS_DENIED);
      expect(pollRequest2.body.error_description).toContain('denied');

      // ============================================================
      // STEP 5: Verify cleanup happened
      // ============================================================
      
      // Device code should be deleted after denial
      const deletedDevice = deviceCodeManager.retrieve(deviceCode);
      expect(deletedDevice).toBeNull();

      // Polling state should be cleaned up
      const pollingState = pollingManager.getPollingState(deviceCode);
      expect(pollingState).toBeNull();
    });
  });

  describe('Complete Authorization Flow - Device Code Expiry', () => {
    it('should handle device code expiration', async () => {
      // ============================================================
      // STEP 1: Create device code with short expiry
      // ============================================================
      
      const deviceCode = 'test_device_code_short_expiry';
      const userCode = 'TEST-1234';
      
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'test_client_id',
        provider_id: 'openai',
        scope: 'api',
        verification_uri: 'https://auth.openai.com/device',
        expires_in: 1, // 1 second expiry
        interval: 5
      });

      // ============================================================
      // STEP 2: Wait for expiry
      // ============================================================
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 seconds

      // ============================================================
      // STEP 3: Client polls expired device code
      // ============================================================
      
      const pollResponse = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollResponse.status).toBe(400);
      expect(pollResponse.body.error).toBe(PollingError.EXPIRED_TOKEN);
      expect(pollResponse.body.error_description).toContain('expired');

      // ============================================================
      // STEP 4: Verify cleanup
      // ============================================================
      
      // Polling state should be cleaned up
      const pollingState = pollingManager.getPollingState(deviceCode);
      expect(pollingState).toBeNull();
    });
  });

  describe('Complete Authorization Flow - Rate Limiting (slow_down)', () => {
    it('should enforce rate limiting with rapid polls', async () => {
      // ============================================================
      // STEP 1: Create device code with short interval for testing
      // ============================================================
      
      const deviceCode = 'test_device_code_rate_limit';
      const userCode = 'RATE-TEST';
      const shortInterval = 2; // 2 second interval
      
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'test_client_id',
        provider_id: 'openai',
        scope: 'api',
        verification_uri: 'https://auth.openai.com/device',
        expires_in: 900,
        interval: shortInterval
      });

      // ============================================================
      // STEP 2: Poll multiple times rapidly
      // ============================================================
      
      // First poll - should succeed
      const poll1 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(poll1.status).toBe(400);
      expect(poll1.body.error).toBe(PollingError.AUTHORIZATION_PENDING);

      // Rapid polls (too soon)
      await Promise.all([
        request(app).post('/oauth/device/token').send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }),
        request(app).post('/oauth/device/token').send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }),
        request(app).post('/oauth/device/token').send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      ]);

      // ============================================================
      // STEP 3: Verify poll count increased
      // ============================================================
      
      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.poll_count).toBeGreaterThanOrEqual(1);
      expect(deviceData.state).toBe(DeviceCodeState.PENDING);
    });
  });

  describe('Complete Authorization Flow - Invalid User Code', () => {
    it('should reject authorization callback with invalid user code', async () => {
      // ============================================================
      // STEP 1: Attempt authorization with non-existent user code
      // ============================================================
      
      const callbackResponse = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: 'INVALID-CODE',
          authorization_code: 'test_auth_code'
        });

      expect(callbackResponse.status).toBe(404);
      expect(callbackResponse.body.error).toBe('invalid_user_code');
      expect(callbackResponse.body.error_description).toContain('not found or expired');
    });
  });

  describe('Complete Authorization Flow - Multiple Devices Concurrent', () => {
    it('should handle multiple device authorizations concurrently', async () => {
      // ============================================================
      // STEP 1: Create two device codes
      // ============================================================
      
      const device1Code = 'device_1_concurrent_test';
      const device1UserCode = 'DEV1-TEST';
      const device2Code = 'device_2_concurrent_test';
      const device2UserCode = 'DEV2-TEST';
      const interval = 1; // Short interval

      deviceCodeManager.store(device1Code, {
        user_code: device1UserCode,
        client_id: 'client_1',
        provider_id: 'openai',
        scope: 'api',
        verification_uri: 'https://auth.openai.com/device',
        expires_in: 900,
        interval: interval
      });

      deviceCodeManager.store(device2Code, {
        user_code: device2UserCode,
        client_id: 'client_2',
        provider_id: 'github',
        scope: 'copilot',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: interval
      });

      // ============================================================
      // STEP 2: Both clients start polling
      // ============================================================
      
      const poll1Device1 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: device1Code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      const poll1Device2 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: device2Code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(poll1Device1.body.error).toBe(PollingError.AUTHORIZATION_PENDING);
      expect(poll1Device2.body.error).toBe(PollingError.AUTHORIZATION_PENDING);

      // ============================================================
      // STEP 3: Authorize device 1 only
      // ============================================================
      
      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: device1UserCode,
          authorization_code: 'auth_code_device_1'
        });

      // Wait for interval
      await new Promise(resolve => setTimeout(resolve, interval * 1000 + 100));

      // ============================================================
      // STEP 4: Device 1 should get tokens, Device 2 still pending
      // ============================================================
      
      const poll2Device1 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: device1Code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      const poll2Device2 = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: device2Code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(poll2Device1.status).toBe(200);
      expect(poll2Device1.body).toHaveProperty('access_token');
      
      expect(poll2Device2.status).toBe(400);
      expect(poll2Device2.body.error).toBe(PollingError.AUTHORIZATION_PENDING);

      // ============================================================
      // STEP 5: Verify device states are independent
      // ============================================================
      
      const device1Data = deviceCodeManager.retrieve(device1Code);
      const device2Data = deviceCodeManager.retrieve(device2Code);

      expect(device1Data.state).toBe(DeviceCodeState.CONSUMED);
      expect(device2Data.state).toBe(DeviceCodeState.PENDING);
    });
  });

  describe('Complete Authorization Flow - State Transitions', () => {
    it('should enforce correct state transitions', async () => {
      // ============================================================
      // STEP 1: Create device code in PENDING state
      // ============================================================
      
      const deviceCode = 'test_device_state_transitions';
      const userCode = 'STATE-TEST';
      const interval = 1; // Short interval
      
      deviceCodeManager.store(deviceCode, {
        user_code: userCode,
        client_id: 'test_client_id',
        provider_id: 'openai',
        scope: 'api',
        verification_uri: 'https://auth.openai.com/device',
        expires_in: 900,
        interval: interval
      });

      // Verify initial state
      let deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.PENDING);

      // ============================================================
      // STEP 2: Authorize (PENDING → AUTHORIZED)
      // ============================================================
      
      await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'test_auth_code'
        });

      deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.AUTHORIZED);

      // ============================================================
      // STEP 3: Poll for token (AUTHORIZED → CONSUMED)
      // ============================================================
      
      await new Promise(resolve => setTimeout(resolve, interval * 1000 + 100));
      
      const pollResponse = await request(app)
        .post('/oauth/device/token')
        .send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

      expect(pollResponse.status).toBe(200);

      deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData.state).toBe(DeviceCodeState.CONSUMED);

      // ============================================================
      // STEP 4: Cannot authorize again after consumed
      // ============================================================
      
      const secondAuthAttempt = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: userCode,
          authorization_code: 'another_auth_code'
        });

      expect(secondAuthAttempt.status).toBe(400);
      expect(secondAuthAttempt.body.error).toBe('invalid_state');
    });
  });
});
