/**
 * OAuth Device Flow Routes Tests
 * 
 * Integration tests for device flow endpoints, focusing on token polling.
 * 
 * @related Issue #1 - OAuth Device Flow (Task 4: Token Polling)
 */

const request = require('supertest');
const express = require('express');
const deviceFlowRouter = require('../../../routes/oauth/device-flow');
const deviceCodeManager = require('../../../services/oauth/device-flow/device-code-manager');
const { DeviceCodeState } = require('../../../services/oauth/device-flow/device-code-manager');
const pollingManager = require('../../../services/oauth/device-flow/polling-manager');
const { PollingError } = require('../../../services/oauth/device-flow/polling-manager');

// Create test app
const app = express();
app.use(express.json());
app.use('/oauth', deviceFlowRouter);

describe('OAuth Device Flow Routes', () => {
  beforeEach(() => {
    // Clear state before each test
    deviceCodeManager._clear();
    pollingManager._clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    deviceCodeManager._clear();
    pollingManager._clearAll();
  });

  describe('POST /oauth/device/token', () => {
    describe('Request validation', () => {
      it('should return error for missing device_code', async () => {
        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('invalid_request');
        expect(response.body.error_description).toContain('device_code is required');
      });

      it('should return error for invalid grant_type', async () => {
        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: 'test_device_123',
            grant_type: 'invalid_grant'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('unsupported_grant_type');
      });

      it('should return error for missing grant_type', async () => {
        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: 'test_device_123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('unsupported_grant_type');
      });
    });

    describe('Device code not found', () => {
      it('should return expired_token for non-existent device code', async () => {
        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: 'non_existent_code',
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(PollingError.EXPIRED_TOKEN);
      });
    });

    describe('Authorization pending', () => {
      it('should return authorization_pending for pending device code', async () => {
        const deviceCode = 'test_device_pending';
        
        // Store pending device code
        deviceCodeManager.store(deviceCode, {
          user_code: 'ABCD-1234',
          client_id: 'test_client',
          provider_id: 'openai',
          scope: 'api.read',
          verification_uri: 'https://example.com/device',
          expires_in: 900,
          interval: 5
        });

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(PollingError.AUTHORIZATION_PENDING);
        expect(response.body.interval).toBe(5);
      });

      it('should increment poll count on each request', async () => {
        const deviceCode = 'test_device_poll_count';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'TEST-5678',
          expires_in: 900,
          interval: 0.1 // Very short for testing
        });

        // Poll three times
        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        // Wait for interval
        await new Promise(resolve => setTimeout(resolve, 150));

        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        const deviceData = deviceCodeManager.retrieve(deviceCode);
        expect(deviceData.poll_count).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Rate limiting and slow_down', () => {
      it('should return slow_down for rapid polling', async () => {
        const deviceCode = 'test_device_rapid';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'RAPID-TEST',
          expires_in: 900,
          interval: 5
        });

        // First poll
        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        // Rapid polls (should trigger slow_down)
        await request(app).post('/oauth/device/token').send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

        await request(app).post('/oauth/device/token').send({
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(PollingError.SLOW_DOWN);
        expect(response.body.interval).toBeGreaterThan(5);
      });

      it('should include increased interval in slow_down response', async () => {
        const deviceCode = 'test_device_backoff';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'BACKOFF-TEST',
          expires_in: 900,
          interval: 5
        });

        // Trigger rapid polling
        for (let i = 0; i < 4; i++) {
          await request(app).post('/oauth/device/token').send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });
        }

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.body.interval).toBeGreaterThan(5);
        expect(response.body.interval).toBeLessThanOrEqual(30);
      });
    });

    describe('Authorization denied', () => {
      it('should return access_denied for denied device code', async () => {
        const deviceCode = 'test_device_denied';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'DENIED-TEST',
          expires_in: 900,
          interval: 5
        });

        // Update state to denied
        deviceCodeManager.updateState(deviceCode, DeviceCodeState.DENIED);

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(PollingError.ACCESS_DENIED);
      });

      it('should clean up polling state on denial', async () => {
        const deviceCode = 'test_device_cleanup_denied';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'CLEANUP-DENIED',
          expires_in: 900,
          interval: 5
        });
        
        await pollingManager.initializePolling(deviceCode);
        deviceCodeManager.updateState(deviceCode, DeviceCodeState.DENIED);

        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        // Polling state should be cleaned up
        expect(pollingManager.getPollingState(deviceCode)).toBeNull();
      });
    });

    describe('Device code expired', () => {
      it('should return expired_token for expired device code', async () => {
        const deviceCode = 'test_device_expired';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'EXPIRED-TEST',
          expires_in: 900,
          interval: 5
        });

        deviceCodeManager.updateState(deviceCode, DeviceCodeState.EXPIRED);

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe(PollingError.EXPIRED_TOKEN);
      });
    });

    describe('Successful authorization', () => {
      it('should return tokens for authorized device code', async () => {
        const deviceCode = 'test_device_authorized';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'AUTH-SUCCESS',
          client_id: 'test_client',
          provider_id: 'openai',
          scope: 'api.read api.write',
          expires_in: 900,
          interval: 5
        });

        // Simulate user authorization
        deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(200);
        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
        expect(response.body.token_type).toBe('Bearer');
        expect(response.body.expires_in).toBe(3600);
        expect(response.body.scope).toBe('api.read api.write');
      });

      it('should mark device code as consumed after issuing tokens', async () => {
        const deviceCode = 'test_device_consume';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'CONSUME-TEST',
          scope: 'api.read',
          expires_in: 900,
          interval: 5
        });

        deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);

        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        const deviceData = deviceCodeManager.retrieve(deviceCode);
        expect(deviceData.state).toBe(DeviceCodeState.CONSUMED);
      });

      it('should clean up polling state after success', async () => {
        const deviceCode = 'test_device_cleanup_success';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'CLEANUP-SUCCESS',
          scope: 'api.read',
          expires_in: 900,
          interval: 5
        });
        
        await pollingManager.initializePolling(deviceCode);
        deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED);

        await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(pollingManager.getPollingState(deviceCode)).toBeNull();
      });
    });

    describe('Already consumed device code', () => {
      it('should return error for already consumed device code', async () => {
        const deviceCode = 'test_device_consumed';
        
        deviceCodeManager.store(deviceCode, {
          user_code: 'CONSUMED-TEST',
          scope: 'api.read',
          expires_in: 900,
          interval: 5
        });

        deviceCodeManager.updateState(deviceCode, DeviceCodeState.CONSUMED);

        const response = await request(app)
          .post('/oauth/device/token')
          .send({
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('invalid_grant');
      });
    });
  });

  describe('POST /oauth/device/code', () => {
    it('should return not_implemented (Task 1 - not yet implemented)', async () => {
      const response = await request(app)
        .post('/oauth/device/code')
        .send({
          client_id: 'test_client',
          scope: 'api.read'
        });

      expect(response.status).toBe(501);
      expect(response.body.error).toBe('not_implemented');
    });
  });

  describe('POST /oauth/device/authorize', () => {
    it('should return not_implemented (Task 3 - not yet implemented)', async () => {
      const response = await request(app)
        .post('/oauth/device/authorize')
        .send({
          user_code: 'ABCD-1234',
          authorization_code: 'auth_code_123'
        });

      expect(response.status).toBe(501);
      expect(response.body.error).toBe('not_implemented');
    });
  });
});
