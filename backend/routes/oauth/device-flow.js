/**
 * OAuth Device Flow Routes
 * 
 * Express router for OAuth Device Authorization Grant endpoints.
 * Implements RFC 8628 device flow API.
 * 
 * Endpoints:
 * - POST /oauth/device/code - Request device code
 * - POST /oauth/device/token - Poll for token
 * - POST /oauth/device/authorize - User authorization callback
 * 
 * @module routes/oauth/device-flow
 * @related Issue #1 - OAuth Device Flow
 */

const express = require('express');
const router = express.Router();
const deviceCodeManager = require('../../services/oauth/device-flow/device-code-manager');
const { DeviceCodeState } = require('../../services/oauth/device-flow/device-code-manager');
const pollingManager = require('../../services/oauth/device-flow/polling-manager');
const { PollingError } = require('../../services/oauth/device-flow/polling-manager');
const tokenManager = require('../../services/oauth/token-manager');

/**
 * POST /oauth/device/code
 * 
 * Initiate device authorization flow
 * 
 * Request body:
 * {
 *   "client_id": "string",
 *   "scope": "string"  // Space-separated scopes
 * }
 * 
 * Response (200):
 * {
 *   "device_code": "string",
 *   "user_code": "string",
 *   "verification_uri": "string",
 *   "expires_in": number,
 *   "interval": number
 * }
 */
router.post('/device/code', async (req, res) => {
  try {
    // TODO: Implement device code endpoint (Task 1)
    res.status(501).json({ error: 'not_implemented' });
  } catch (error) {
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

/**
 * POST /oauth/device/token
 * 
 * Poll for device authorization completion (RFC 8628 Section 3.4)
 * 
 * Client polls this endpoint repeatedly until authorization completes.
 * Returns different responses based on device code state:
 * - authorization_pending: User hasn't completed authorization yet
 * - slow_down: Client is polling too fast (with increased interval)
 * - expired_token: Device code has expired
 * - access_denied: User denied authorization
 * - Success (200): Returns access token
 * 
 * Request body:
 * {
 *   "device_code": "string",
 *   "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
 * }
 * 
 * Response (200 - authorized):
 * {
 *   "access_token": "string",
 *   "refresh_token": "string",
 *   "token_type": "Bearer",
 *   "expires_in": number
 * }
 * 
 * Response (400 - pending/error):
 * {
 *   "error": "authorization_pending" | "slow_down" | "expired_token" | "access_denied",
 *   "interval": number  // Returned for slow_down
 * }
 */
router.post('/device/token', async (req, res) => {
  try {
    const { device_code, grant_type } = req.body;

    // Validate request
    if (!device_code) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'device_code is required'
      });
    }

    if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'grant_type must be urn:ietf:params:oauth:grant-type:device_code'
      });
    }

    // Retrieve device code data first (needed for interval and state)
    const deviceData = deviceCodeManager.retrieve(device_code);

    if (!deviceData) {
      // Device code not found or expired
      await pollingManager.cleanupPolling(device_code);
      return res.status(400).json({
        error: PollingError.EXPIRED_TOKEN,
        error_description: 'Device code has expired'
      });
    }

    // Initialize polling manager with device code's interval if not already initialized
    if (!pollingManager.getPollingState(device_code)) {
      await pollingManager.initializePolling(device_code, deviceData.interval);
    }

    // Check rate limiting via polling manager
    const pollResult = await pollingManager.recordPoll(device_code);
    
    if (!pollResult.allowed) {
      // Client is polling too fast
      const response = {
        error: pollResult.error,
        interval: pollResult.interval
      };

      if (pollResult.error === PollingError.SLOW_DOWN) {
        response.error_description = 'Polling too frequently. Slow down.';
      } else if (pollResult.error === PollingError.AUTHORIZATION_PENDING) {
        response.error_description = 'Authorization pending. Try again later.';
      }

      return res.status(400).json(response);
    }

    // Increment poll count in storage
    deviceCodeManager.incrementPollCount(device_code);

    // Check device code state
    switch (deviceData.state) {
      case DeviceCodeState.PENDING:
        // Authorization still pending
        return res.status(400).json({
          error: PollingError.AUTHORIZATION_PENDING,
          error_description: 'User has not yet authorized the device',
          interval: pollResult.interval
        });

      case DeviceCodeState.DENIED:
        // User denied authorization
        await pollingManager.cleanupPolling(device_code);
        deviceCodeManager.delete(device_code);
        return res.status(400).json({
          error: PollingError.ACCESS_DENIED,
          error_description: 'User denied the authorization request'
        });

      case DeviceCodeState.EXPIRED:
        // Device code expired
        await pollingManager.cleanupPolling(device_code);
        deviceCodeManager.delete(device_code);
        return res.status(400).json({
          error: PollingError.EXPIRED_TOKEN,
          error_description: 'Device code has expired'
        });

      case DeviceCodeState.AUTHORIZED:
        // Success! User has authorized - generate tokens
        
        // TODO: Real token generation will be integrated later
        // For now, return mock tokens as per requirements
        const mockAccessToken = `mock_access_token_${Date.now()}`;
        const mockRefreshToken = `mock_refresh_token_${Date.now()}`;
        
        // Mark device code as consumed
        deviceCodeManager.updateState(device_code, DeviceCodeState.CONSUMED);
        
        // Clean up polling state
        await pollingManager.cleanupPolling(device_code);
        
        // Return tokens (RFC 8628 Section 3.5)
        return res.status(200).json({
          access_token: mockAccessToken,
          refresh_token: mockRefreshToken,
          token_type: 'Bearer',
          expires_in: 3600, // 1 hour
          scope: deviceData.scope
        });

      case DeviceCodeState.CONSUMED:
        // Token already issued
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Device code has already been used'
        });

      default:
        // Unknown state
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Invalid device code state'
        });
    }
  } catch (error) {
    console.error('[Device Token Endpoint] Error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * POST /oauth/device/authorize
 * 
 * User authorization callback (after browser authentication)
 * 
 * Request body:
 * {
 *   "user_code": "string",
 *   "authorization_code": "string"
 * }
 * 
 * Response (200):
 * {
 *   "success": true
 * }
 */
router.post('/device/authorize', async (req, res) => {
  try {
    // TODO: Implement authorization callback (Task 3)
    res.status(501).json({ error: 'not_implemented' });
  } catch (error) {
    res.status(500).json({ error: 'server_error', message: error.message });
  }
});

module.exports = router;
