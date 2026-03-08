/**
 * Token Manager Tests
 * 
 * Tests OAuth token lifecycle management including validation,
 * refresh, and revocation.
 * 
 * @related Issue #4 - OAuth Token Management
 */

const axios = require('axios');
const tokenManager = require('../../services/oauth/token-manager');
const tokenStorage = require('../../services/oauth/token-storage');
const { TokenState } = require('../../services/oauth/token-manager');

jest.mock('axios');
jest.mock('../../services/oauth/token-storage');

describe('TokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear all mock implementations and return values
    tokenStorage.getToken.mockReset();
    tokenStorage.saveToken.mockReset();
    tokenStorage.deleteToken.mockReset();
    tokenStorage.listProviders.mockReset();
    tokenStorage.updateToken.mockReset();
    axios.post.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveTokens', () => {
    it('should save OAuth token response', async () => {
      const providerId = 'openai';
      const tokenResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'api.read api.write'
      };

      const now = Math.floor(Date.now() / 1000);
      await tokenManager.saveTokens(providerId, tokenResponse);

      expect(tokenStorage.saveToken).toHaveBeenCalledWith(providerId, {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: now + 3600,
        token_type: 'Bearer',
        scopes: ['api.read', 'api.write']
      });
    });

    it('should default to Bearer token type', async () => {
      const tokenResponse = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600
      };

      await tokenManager.saveTokens('test', tokenResponse);

      expect(tokenStorage.saveToken).toHaveBeenCalledWith('test', 
        expect.objectContaining({ token_type: 'Bearer' })
      );
    });

    it('should handle array scopes', async () => {
      const tokenResponse = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        scope: ['read', 'write']
      };

      await tokenManager.saveTokens('test', tokenResponse);

      expect(tokenStorage.saveToken).toHaveBeenCalledWith('test',
        expect.objectContaining({ scopes: ['read', 'write'] })
      );
    });
  });

  describe('getAccessToken', () => {
    const providerConfig = {
      token_endpoint: 'https://provider.com/oauth/token',
      client_id: 'test_client'
    };

    it('should return valid token without refresh', async () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = {
        access_token: 'valid_token',
        refresh_token: 'refresh_token',
        expires_at: now + 3600, // Valid for 1 hour
        token_type: 'Bearer'
      };

      tokenStorage.getToken.mockResolvedValue(validToken);

      const result = await tokenManager.getAccessToken('openai', providerConfig);

      expect(result).toBe('valid_token');
      expect(axios.post).not.toHaveBeenCalled(); // No refresh needed
    });

    it('should refresh token if expiring soon', async () => {
      // Use a token expiring in 1 second (way less than 300s buffer)
      const expiringToken = {
        access_token: 'expiring_token',
        refresh_token: 'refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 1,
        token_type: 'Bearer'
      };

      const refreshedToken = {
        access_token: 'new_token',
        refresh_token: 'new_refresh',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      const refreshedStoredToken = {
        access_token: 'new_token',
        refresh_token: 'new_refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
        scopes: []
      };

      // First call returns expiring token
      // Second call (inside refreshToken) returns expiring token again for consistency
      // Third call (after refresh) returns new token
      tokenStorage.getToken
        .mockResolvedValueOnce(expiringToken)
        .mockResolvedValueOnce(expiringToken)
        .mockResolvedValueOnce(refreshedStoredToken);
      
      // saveToken needs to resolve successfully
      tokenStorage.saveToken.mockResolvedValue(undefined);

      axios.post.mockResolvedValue({ data: refreshedToken });

      const result = await tokenManager.getAccessToken('openai', providerConfig);

      expect(axios.post).toHaveBeenCalled();
      expect(result).toBe('new_token');
      expect(axios.post).toHaveBeenCalledWith(
        providerConfig.token_endpoint,
        expect.objectContaining({
          grant_type: 'refresh_token',
          refresh_token: 'refresh_token'
        }),
        expect.any(Object)
      );
    });

    it('should throw if token not found', async () => {
      tokenStorage.getToken.mockResolvedValue(null);

      await expect(
        tokenManager.getAccessToken('nonexistent', providerConfig)
      ).rejects.toThrow('No token found for provider: nonexistent');
    });

    it('should delete token and throw if refresh fails', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = {
        access_token: 'expired_token',
        refresh_token: 'refresh_token',
        expires_at: now - 100, // Already expired
        token_type: 'Bearer'
      };

      tokenStorage.getToken.mockResolvedValue(expiredToken);
      axios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'invalid_grant' }
        }
      });

      await expect(
        tokenManager.getAccessToken('openai', providerConfig)
      ).rejects.toThrow('Token refresh failed');

      expect(tokenStorage.deleteToken).toHaveBeenCalledWith('openai');
    });
  });

  describe('checkTokenValidity', () => {
    it('should return VALID state for fresh token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: now + 3600,
        scopes: ['read']
      };

      tokenStorage.getToken.mockResolvedValue(validToken);

      const result = await tokenManager.checkTokenValidity('openai');

      expect(result).toMatchObject({
        state: TokenState.VALID,
        valid: true,
        expires_in: 3600,
        scopes: ['read']
      });
    });

    it('should return EXPIRING_SOON state within buffer', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiringToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: now + 240 // 4 minutes
      };

      tokenStorage.getToken.mockResolvedValue(expiringToken);

      const result = await tokenManager.checkTokenValidity('openai');

      expect(result).toMatchObject({
        state: TokenState.EXPIRING_SOON,
        valid: true,
        expires_in: 240
      });
    });

    it('should return EXPIRED state for past expiry', async () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: now - 100
      };

      tokenStorage.getToken.mockResolvedValue(expiredToken);

      const result = await tokenManager.checkTokenValidity('openai');

      expect(result).toMatchObject({
        state: TokenState.EXPIRED,
        valid: false
      });
    });

    it('should return NOT_FOUND state if no token', async () => {
      tokenStorage.getToken.mockResolvedValue(null);

      const result = await tokenManager.checkTokenValidity('nonexistent');

      expect(result).toMatchObject({
        state: TokenState.NOT_FOUND,
        valid: false,
        message: 'No token found'
      });
    });
  });

  describe('refreshToken', () => {
    const providerConfig = {
      token_endpoint: 'https://provider.com/oauth/token',
      client_id: 'test_client'
    };

    it('should refresh token successfully', async () => {
      const existingToken = {
        access_token: 'old_token',
        refresh_token: 'refresh_token',
        expires_at: 1709485200
      };

      const refreshResponse = {
        access_token: 'new_token',
        refresh_token: 'new_refresh',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      axios.post.mockResolvedValue({ data: refreshResponse });

      await tokenManager.refreshToken('openai', providerConfig);

      expect(axios.post).toHaveBeenCalledWith(
        providerConfig.token_endpoint,
        {
          grant_type: 'refresh_token',
          refresh_token: 'refresh_token',
          client_id: 'test_client'
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      expect(tokenStorage.saveToken).toHaveBeenCalled();
    });

    it('should throw if no token found', async () => {
      tokenStorage.getToken.mockResolvedValue(null);

      await expect(
        tokenManager.refreshToken('nonexistent', providerConfig)
      ).rejects.toThrow('No token found for provider: nonexistent');
    });

    it('should throw if no refresh token available', async () => {
      const tokenWithoutRefresh = {
        access_token: 'token',
        expires_at: 1709485200
        // Missing refresh_token
      };

      tokenStorage.getToken.mockResolvedValue(tokenWithoutRefresh);

      await expect(
        tokenManager.refreshToken('openai', providerConfig)
      ).rejects.toThrow('No refresh token available');
    });

    it('should throw descriptive error on HTTP error', async () => {
      const existingToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1709485200
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'invalid_grant' },
          statusText: 'Bad Request'
        }
      });

      await expect(
        tokenManager.refreshToken('openai', providerConfig)
      ).rejects.toThrow('Token refresh failed: 400 invalid_grant');
    });

    it('should handle network errors', async () => {
      const existingToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1709485200
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      axios.post.mockRejectedValue(new Error('Network timeout'));

      await expect(
        tokenManager.refreshToken('openai', providerConfig)
      ).rejects.toThrow('Token refresh request failed: Network timeout');
    });
  });

  describe('revokeToken', () => {
    const providerConfig = {
      revocation_endpoint: 'https://provider.com/oauth/revoke',
      client_id: 'test_client'
    };

    it('should revoke token and delete from storage', async () => {
      const existingToken = {
        access_token: 'token_to_revoke',
        refresh_token: 'refresh',
        expires_at: 1709485200
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      tokenStorage.deleteToken.mockResolvedValue(true);
      axios.post.mockResolvedValue({ data: {} });

      await tokenManager.revokeToken('openai', providerConfig);

      expect(tokenStorage.deleteToken).toHaveBeenCalledWith('openai');
      expect(axios.post).toHaveBeenCalledWith(
        providerConfig.revocation_endpoint,
        {
          token: 'token_to_revoke',
          client_id: 'test_client'
        },
        expect.any(Object)
      );
    });

    it('should delete locally even if revocation fails', async () => {
      const existingToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1709485200
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      tokenStorage.deleteToken.mockResolvedValue(true);
      axios.post.mockRejectedValue(new Error('Provider unreachable'));

      // Should not throw
      await tokenManager.revokeToken('openai', providerConfig);

      expect(tokenStorage.deleteToken).toHaveBeenCalledWith('openai');
    });

    it('should handle missing revocation endpoint gracefully', async () => {
      const configWithoutRevoke = {
        token_endpoint: 'https://provider.com/oauth/token',
        client_id: 'test_client'
        // No revocation_endpoint
      };

      const existingToken = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 1709485200
      };

      tokenStorage.getToken.mockResolvedValue(existingToken);
      tokenStorage.deleteToken.mockResolvedValue(true);

      await tokenManager.revokeToken('openai', configWithoutRevoke);

      expect(tokenStorage.deleteToken).toHaveBeenCalledWith('openai');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should succeed if token already deleted', async () => {
      tokenStorage.getToken.mockResolvedValue(null);
      tokenStorage.deleteToken.mockResolvedValue(false);

      await tokenManager.revokeToken('nonexistent', providerConfig);

      expect(tokenStorage.deleteToken).toHaveBeenCalledWith('nonexistent');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('listTokens', () => {
    it('should list all tokens with status', async () => {
      const now = Math.floor(Date.now() / 1000);

      tokenStorage.listProviders.mockResolvedValue(['openai', 'github']);
      
      tokenStorage.getToken
        .mockResolvedValueOnce({
          access_token: 'token1',
          refresh_token: 'refresh1',
          expires_at: now + 3600,
          scopes: ['read']
        })
        .mockResolvedValueOnce({
          access_token: 'token2',
          refresh_token: 'refresh2',
          expires_at: now + 240,
          scopes: ['write']
        });

      const result = await tokenManager.listTokens();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        provider_id: 'openai',
        state: TokenState.VALID,
        valid: true
      });
      expect(result[1]).toMatchObject({
        provider_id: 'github',
        state: TokenState.EXPIRING_SOON,
        valid: true
      });
    });

    it('should return empty array if no tokens', async () => {
      tokenStorage.listProviders.mockResolvedValue([]);

      const result = await tokenManager.listTokens();

      expect(result).toEqual([]);
    });
  });
});
