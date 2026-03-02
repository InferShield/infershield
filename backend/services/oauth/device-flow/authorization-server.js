/**
 * Device Authorization Server
 * 
 * Implements OAuth Device Authorization Grant (RFC 8628) endpoint handler.
 * Generates device codes and user codes for device authentication flow.
 * 
 * Endpoint: POST /oauth/device/authorize
 * 
 * Request:
 * {
 *   "client_id": "infershield_client",
 *   "scope": "api.read api.write",
 *   "provider_id": "openai"
 * }
 * 
 * Response:
 * {
 *   "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
 *   "user_code": "WDJB-MJHT",
 *   "verification_uri": "https://auth.provider.com/device",
 *   "verification_uri_complete": "https://auth.provider.com/device?user_code=WDJB-MJHT",
 *   "expires_in": 900,
 *   "interval": 5
 * }
 * 
 * Security:
 * - Device codes are cryptographically random (256 bits)
 * - User codes are human-readable and time-limited
 * - Stored in-memory (ephemeral, no persistence)
 * - Automatic cleanup of expired codes
 * 
 * @module oauth/device-flow/authorization-server
 * @related Issue #1 - OAuth Device Flow (First Task)
 */

const crypto = require('crypto');

// Default configuration (can be overridden per provider)
const DEFAULT_CONFIG = {
  deviceCodeLength: 32,           // bytes (256 bits)
  userCodeLength: 8,              // characters (A-Z, 0-9, no ambiguous chars)
  expiresIn: 900,                 // 15 minutes (standard)
  interval: 5,                    // polling interval in seconds
  userCodeCharset: 'ACDEFGHJKLMNPQRTUVWXY34679' // No ambiguous: 0/O, 1/I, 8/B, 2/Z, 5/S
};

// Provider configurations
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    verification_uri: 'https://auth.openai.com/device',
    scopes: ['api']
  },
  github: {
    name: 'GitHub',
    verification_uri: 'https://github.com/login/device',
    scopes: ['copilot', 'user']
  },
  anthropic: {
    name: 'Anthropic',
    verification_uri: 'https://auth.anthropic.com/device',
    scopes: ['api']
  }
};

// In-memory device code storage (ephemeral)
const deviceCodeStore = new Map();

/**
 * Generate cryptographically random device code
 * 
 * @param {number} length - Length in bytes
 * @returns {string} Base64url-encoded device code
 */
function generateDeviceCode(length = DEFAULT_CONFIG.deviceCodeLength) {
  return crypto
    .randomBytes(length)
    .toString('base64url'); // URL-safe base64 (no padding)
}

/**
 * Generate human-readable user code
 * 
 * Format: XXXX-XXXX (8 characters with separator)
 * Charset: A-Z, 0-9 excluding ambiguous characters (0/O, 1/I, 8/B, 2/Z, 5/S)
 * 
 * @param {number} length - Number of characters (default 8)
 * @returns {string} User code with separator (e.g., "WDJB-MJHT")
 */
function generateUserCode(length = DEFAULT_CONFIG.userCodeLength) {
  const charset = DEFAULT_CONFIG.userCodeCharset;
  const code = Array.from({ length }, () => {
    const randomIndex = crypto.randomInt(charset.length);
    return charset[randomIndex];
  }).join('');
  
  // Insert separator after half for readability
  const half = Math.floor(length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

/**
 * Store device authorization request
 * 
 * @param {Object} deviceData - Device authorization data
 * @returns {void}
 */
function storeDeviceAuthorization(deviceData) {
  deviceCodeStore.set(deviceData.device_code, {
    ...deviceData,
    created_at: Date.now(),
    state: 'pending',
    poll_count: 0
  });
}

/**
 * Retrieve device authorization by device code
 * 
 * @param {string} deviceCode - Device code
 * @returns {Object|null} Device authorization data or null if not found
 */
function getDeviceAuthorization(deviceCode) {
  return deviceCodeStore.get(deviceCode) || null;
}

/**
 * Check if device code has expired
 * 
 * @param {Object} deviceData - Device authorization data
 * @returns {boolean} True if expired
 */
function isExpired(deviceData) {
  const expiresAt = deviceData.created_at + (deviceData.expires_in * 1000);
  return Date.now() > expiresAt;
}

/**
 * Clean up expired device codes
 * 
 * @returns {number} Number of codes cleaned up
 */
function cleanupExpiredCodes() {
  let count = 0;
  for (const [deviceCode, deviceData] of deviceCodeStore.entries()) {
    if (isExpired(deviceData)) {
      deviceCodeStore.delete(deviceCode);
      count++;
    }
  }
  return count;
}

/**
 * Handle device authorization request
 * 
 * POST /oauth/device/authorize
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function handleDeviceAuthorizationRequest(req, res) {
  try {
    // Cleanup expired codes before processing (opportunistic cleanup)
    cleanupExpiredCodes();
    
    // Extract and validate request parameters
    const { client_id, scope, provider_id } = req.body;
    
    // Validate required fields
    if (!client_id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameter: client_id'
      });
    }
    
    if (!provider_id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameter: provider_id'
      });
    }
    
    // Validate provider exists
    const provider = PROVIDERS[provider_id];
    if (!provider) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: `Unknown provider: ${provider_id}`
      });
    }
    
    // Parse and validate scopes
    const requestedScopes = scope ? scope.split(' ') : [];
    const validScopes = provider.scopes || [];
    
    // Filter to only valid scopes for this provider
    const grantedScopes = requestedScopes.filter(s => validScopes.includes(s));
    if (requestedScopes.length > 0 && grantedScopes.length === 0) {
      return res.status(400).json({
        error: 'invalid_scope',
        error_description: 'None of the requested scopes are valid for this provider'
      });
    }
    
    // Generate device and user codes
    const deviceCode = generateDeviceCode();
    const userCode = generateUserCode();
    
    // Build verification URIs
    const verificationUri = provider.verification_uri;
    const verificationUriComplete = `${verificationUri}?user_code=${userCode}`;
    
    // Get configuration (use defaults)
    const expiresIn = DEFAULT_CONFIG.expiresIn;
    const interval = DEFAULT_CONFIG.interval;
    
    // Store device authorization request
    const deviceData = {
      device_code: deviceCode,
      user_code: userCode,
      client_id,
      provider_id,
      scope: grantedScopes.join(' '),
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      expires_in: expiresIn,
      interval
    };
    
    storeDeviceAuthorization(deviceData);
    
    // Return response per RFC 8628
    return res.status(200).json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      verification_uri_complete: verificationUriComplete,
      expires_in: expiresIn,
      interval
    });
    
  } catch (error) {
    console.error('Device authorization error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error processing device authorization request'
    });
  }
}

/**
 * Get device authorization status (for polling/debugging)
 * 
 * GET /oauth/device/status/:device_code
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
async function getDeviceAuthorizationStatus(req, res) {
  try {
    const { device_code } = req.params;
    
    if (!device_code) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing device_code parameter'
      });
    }
    
    const deviceData = getDeviceAuthorization(device_code);
    
    if (!deviceData) {
      return res.status(404).json({
        error: 'invalid_device_code',
        error_description: 'Device code not found or expired'
      });
    }
    
    // Check if expired
    if (isExpired(deviceData)) {
      deviceCodeStore.delete(device_code);
      return res.status(400).json({
        error: 'expired_token',
        error_description: 'Device code has expired'
      });
    }
    
    // Return status (without sensitive fields)
    return res.status(200).json({
      state: deviceData.state,
      provider_id: deviceData.provider_id,
      scope: deviceData.scope,
      expires_in: Math.floor((deviceData.created_at + deviceData.expires_in * 1000 - Date.now()) / 1000),
      poll_count: deviceData.poll_count
    });
    
  } catch (error) {
    console.error('Device status error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}

// Export functions
module.exports = {
  handleDeviceAuthorizationRequest,
  getDeviceAuthorizationStatus,
  generateDeviceCode,
  generateUserCode,
  cleanupExpiredCodes,
  
  // For testing
  _internals: {
    deviceCodeStore,
    PROVIDERS,
    DEFAULT_CONFIG,
    storeDeviceAuthorization,
    getDeviceAuthorization,
    isExpired
  }
};
