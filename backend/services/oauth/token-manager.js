/**
 * OAuth Token Manager
 * 
 * Manages OAuth token lifecycle including validation, refresh, and revocation.
 * Implements proactive refresh strategy with 5-minute expiry buffer.
 * 
 * Security:
 * - Tokens validated before every API request
 * - Automatic refresh when approaching expiry
 * - No plaintext token logging
 * - Secure revocation with fallback cleanup
 * 
 * @module oauth/token-manager
 * @related Issue #4 - OAuth Token Management
 */

const tokenStorage = require('./token-storage');
const axios = require('axios');

const REFRESH_BUFFER_SECONDS = 300; // 5 minutes

/**
 * Token lifecycle states
 */
const TokenState = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
  INVALID: 'invalid',
  NOT_FOUND: 'not_found'
};

/**
 * Token Manager
 * 
 * Handles OAuth token operations with lifecycle management.
 */
class TokenManager {
  /**
   * Save tokens received from OAuth flow
   * 
   * @param {string} providerId - Provider identifier
   * @param {Object} tokenResponse - OAuth token response
   * @param {string} tokenResponse.access_token
   * @param {string} tokenResponse.refresh_token
   * @param {number} tokenResponse.expires_in - Expiry in seconds
   * @param {string} tokenResponse.token_type
   * @param {string[]} [tokenResponse.scope] - Token scopes
   * @returns {Promise<void>}
   */
  async saveTokens(providerId, tokenResponse) {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenData = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: now + tokenResponse.expires_in,
      token_type: tokenResponse.token_type || 'Bearer',
      scopes: this._parseScopes(tokenResponse.scope)
    };

    await tokenStorage.saveToken(providerId, tokenData);
  }

  /**
   * Get valid access token for provider
   * 
   * Automatically refreshes if token is expiring soon (within 5 min buffer).
   * Throws if token is invalid or refresh fails.
   * 
   * @param {string} providerId - Provider identifier
   * @param {Object} providerConfig - Provider OAuth configuration
   * @returns {Promise<string>} Valid access token
   * @throws {Error} If token invalid or refresh fails
   */
  async getAccessToken(providerId, providerConfig) {
    const token = await tokenStorage.getToken(providerId);
    if (!token) {
      throw new Error(`No token found for provider: ${providerId}`);
    }

    const state = this._getTokenState(token);

    if (state === TokenState.VALID) {
      return token.access_token;
    }

    if (state === TokenState.EXPIRING_SOON || state === TokenState.EXPIRED) {
      // Attempt refresh
      try {
        await this.refreshToken(providerId, providerConfig);
        const refreshed = await tokenStorage.getToken(providerId);
        return refreshed.access_token;
      } catch (err) {
        // Refresh failed - mark invalid and propagate error
        await tokenStorage.deleteToken(providerId);
        throw new Error(`Token refresh failed for ${providerId}: ${err.message}`);
      }
    }

    throw new Error(`Invalid token state for ${providerId}: ${state}`);
  }

  /**
   * Check token validity state
   * 
   * @param {string} providerId - Provider identifier
   * @returns {Promise<Object>} Token state information
   */
  async checkTokenValidity(providerId) {
    const token = await tokenStorage.getToken(providerId);
    if (!token) {
      return {
        state: TokenState.NOT_FOUND,
        valid: false,
        message: 'No token found'
      };
    }

    const state = this._getTokenState(token);
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = token.expires_at - now;

    return {
      state,
      valid: state === TokenState.VALID || state === TokenState.EXPIRING_SOON,
      expires_at: token.expires_at,
      expires_in: expiresIn,
      message: this._getStateMessage(state, expiresIn),
      scopes: token.scopes
    };
  }

  /**
   * Refresh access token
   * 
   * @param {string} providerId - Provider identifier
   * @param {Object} providerConfig - Provider OAuth configuration
   * @param {string} providerConfig.token_endpoint
   * @param {string} providerConfig.client_id
   * @returns {Promise<void>}
   * @throws {Error} If refresh fails
   */
  async refreshToken(providerId, providerConfig) {
    const token = await tokenStorage.getToken(providerId);
    if (!token) {
      throw new Error(`No token found for provider: ${providerId}`);
    }

    if (!token.refresh_token) {
      throw new Error(`No refresh token available for provider: ${providerId}`);
    }

    const refreshParams = {
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: providerConfig.client_id
    };

    try {
      const response = await axios.post(
        providerConfig.token_endpoint,
        refreshParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      await this.saveTokens(providerId, response.data);
    } catch (err) {
      if (err.response) {
        throw new Error(`Token refresh failed: ${err.response.status} ${err.response.data?.error || err.response.statusText}`);
      }
      throw new Error(`Token refresh request failed: ${err.message}`);
    }
  }

  /**
   * Revoke token and remove from storage
   * 
   * @param {string} providerId - Provider identifier
   * @param {Object} providerConfig - Provider OAuth configuration
   * @param {string} providerConfig.revocation_endpoint
   * @param {string} providerConfig.client_id
   * @returns {Promise<void>}
   */
  async revokeToken(providerId, providerConfig) {
    const token = await tokenStorage.getToken(providerId);
    
    // Delete from storage first (fail-safe)
    await tokenStorage.deleteToken(providerId);

    if (!token) {
      return; // Already deleted
    }

    // Attempt to revoke with provider (best-effort)
    if (providerConfig.revocation_endpoint) {
      try {
        await this._revokeWithProvider(token, providerConfig);
      } catch (err) {
        // Log but don't throw - local deletion already succeeded
        console.warn(`Provider revocation failed for ${providerId}:`, err.message);
      }
    }
  }

  /**
   * List all stored provider tokens with status
   * 
   * @returns {Promise<Array>} Array of provider token info
   */
  async listTokens() {
    const providers = await tokenStorage.listProviders();
    
    const tokens = await Promise.all(
      providers.map(async (providerId) => {
        const validity = await this.checkTokenValidity(providerId);
        return {
          provider_id: providerId,
          ...validity
        };
      })
    );

    return tokens;
  }

  // ==================== INTERNAL HELPERS ====================

  /**
   * Determine token state based on expiry
   */
  _getTokenState(token) {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = token.expires_at - now;

    if (expiresIn <= 0) {
      return TokenState.EXPIRED;
    }

    if (expiresIn < REFRESH_BUFFER_SECONDS) {
      return TokenState.EXPIRING_SOON;
    }

    return TokenState.VALID;
  }

  /**
   * Get human-readable state message
   */
  _getStateMessage(state, expiresIn) {
    switch (state) {
      case TokenState.VALID:
        return `Valid (expires in ${Math.floor(expiresIn / 60)} minutes)`;
      case TokenState.EXPIRING_SOON:
        return `Expiring soon (${expiresIn} seconds remaining)`;
      case TokenState.EXPIRED:
        return 'Expired';
      case TokenState.INVALID:
        return 'Invalid';
      case TokenState.NOT_FOUND:
        return 'Not found';
      default:
        return 'Unknown';
    }
  }

  /**
   * Parse scope string to array
   */
  _parseScopes(scope) {
    if (!scope) return [];
    if (Array.isArray(scope)) return scope;
    return scope.split(' ');
  }

  /**
   * Revoke token with OAuth provider
   */
  async _revokeWithProvider(token, providerConfig) {
    const revokeParams = {
      token: token.access_token,
      client_id: providerConfig.client_id
    };

    await axios.post(
      providerConfig.revocation_endpoint,
      revokeParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
  }
}

module.exports = new TokenManager();
module.exports.TokenState = TokenState;
