/**
 * Device Authorization Server Tests
 * 
 * Unit tests for OAuth device authorization endpoint handler.
 * Tests RFC 8628 compliance and error handling.
 * 
 * @related Issue #1 - OAuth Device Flow (First Task)
 */

const authorizationServer = require('../../../services/oauth/device-flow/authorization-server');

// Mock Express request/response objects
function createMockRequest(body = {}, params = {}) {
  return {
    body,
    params
  };
}

function createMockResponse() {
  const res = {
    statusCode: 0,
    jsonData: null
  };
  
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  
  return res;
}

describe('Device Authorization Server', () => {
  beforeEach(() => {
    // Clear device code store before each test
    authorizationServer._internals.deviceCodeStore.clear();
  });
  
  describe('generateDeviceCode', () => {
    it('should generate cryptographically random device code', () => {
      const code1 = authorizationServer.generateDeviceCode();
      const code2 = authorizationServer.generateDeviceCode();
      
      expect(code1).toBeTruthy();
      expect(code2).toBeTruthy();
      expect(code1).not.toBe(code2);
      expect(code1.length).toBeGreaterThan(20); // Base64url-encoded, > 20 chars
    });
    
    it('should generate URL-safe base64 code (no padding)', () => {
      const code = authorizationServer.generateDeviceCode();
      
      // Should not contain base64 padding (=)
      expect(code).not.toContain('=');
      
      // Should only contain URL-safe characters
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
  
  describe('generateUserCode', () => {
    it('should generate human-readable user code', () => {
      const code = authorizationServer.generateUserCode();
      
      expect(code).toBeTruthy();
      expect(code).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/); // Format: XXXX-XXXX
      expect(code.length).toBe(9); // 8 chars + 1 separator
    });
    
    it('should not contain ambiguous characters', () => {
      const ambiguousChars = ['0', 'O', '1', 'I', '8', 'B', '2', 'Z', '5', 'S'];
      
      for (let i = 0; i < 100; i++) {
        const code = authorizationServer.generateUserCode();
        
        for (const char of ambiguousChars) {
          expect(code).not.toContain(char);
        }
      }
    });
    
    it('should generate unique user codes', () => {
      const codes = new Set();
      
      for (let i = 0; i < 100; i++) {
        const code = authorizationServer.generateUserCode();
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });
  });
  
  describe('handleDeviceAuthorizationRequest', () => {
    it('should generate device authorization response', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.statusCode).toBe(200);
      expect(res.jsonData).toHaveProperty('device_code');
      expect(res.jsonData).toHaveProperty('user_code');
      expect(res.jsonData).toHaveProperty('verification_uri');
      expect(res.jsonData).toHaveProperty('verification_uri_complete');
      expect(res.jsonData).toHaveProperty('expires_in');
      expect(res.jsonData).toHaveProperty('interval');
    });
    
    it('should set expiration time correctly', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.jsonData.expires_in).toBe(900); // 15 minutes default
      expect(res.jsonData.interval).toBe(5); // 5 seconds polling interval
    });
    
    it('should include provider verification URI', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.jsonData.verification_uri).toBe('https://auth.openai.com/device');
      expect(res.jsonData.verification_uri_complete).toContain('https://auth.openai.com/device?user_code=');
    });
    
    it('should store device authorization in memory', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'github',
        scope: 'copilot user'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      const deviceCode = res.jsonData.device_code;
      const stored = authorizationServer._internals.getDeviceAuthorization(deviceCode);
      
      expect(stored).toBeTruthy();
      expect(stored.client_id).toBe('test_client');
      expect(stored.provider_id).toBe('github');
      expect(stored.scope).toBe('copilot user');
      expect(stored.state).toBe('pending');
    });
    
    it('should return error if client_id missing', async () => {
      const req = createMockRequest({
        provider_id: 'openai'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('invalid_request');
      expect(res.jsonData.error_description).toContain('client_id');
    });
    
    it('should return error if provider_id missing', async () => {
      const req = createMockRequest({
        client_id: 'test_client'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('invalid_request');
      expect(res.jsonData.error_description).toContain('provider_id');
    });
    
    it('should return error for unknown provider', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'unknown_provider'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('invalid_request');
      expect(res.jsonData.error_description).toContain('Unknown provider');
    });
    
    it('should filter invalid scopes', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api invalid_scope'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      const deviceCode = res.jsonData.device_code;
      const stored = authorizationServer._internals.getDeviceAuthorization(deviceCode);
      
      expect(stored.scope).toBe('api'); // Only valid scope granted
    });
    
    it('should return error if no valid scopes requested', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'invalid_scope1 invalid_scope2'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('invalid_scope');
    });
    
    it('should handle multiple providers', async () => {
      // OpenAI request
      const req1 = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api'
      });
      const res1 = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(req1, res1);
      
      // GitHub request
      const req2 = createMockRequest({
        client_id: 'test_client',
        provider_id: 'github',
        scope: 'copilot'
      });
      const res2 = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(req2, res2);
      
      expect(res1.jsonData.verification_uri).toContain('openai');
      expect(res2.jsonData.verification_uri).toContain('github');
      
      // Both should be stored
      expect(authorizationServer._internals.deviceCodeStore.size).toBe(2);
    });
  });
  
  describe('getDeviceAuthorizationStatus', () => {
    it('should return device authorization status', async () => {
      // First create a device authorization
      const createReq = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai',
        scope: 'api'
      });
      const createRes = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(createReq, createRes);
      
      const deviceCode = createRes.jsonData.device_code;
      
      // Now get status
      const statusReq = createMockRequest({}, { device_code: deviceCode });
      const statusRes = createMockResponse();
      await authorizationServer.getDeviceAuthorizationStatus(statusReq, statusRes);
      
      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.jsonData.state).toBe('pending');
      expect(statusRes.jsonData.provider_id).toBe('openai');
      expect(statusRes.jsonData.scope).toBe('api');
    });
    
    it('should return error for missing device code', async () => {
      const req = createMockRequest({}, {});
      const res = createMockResponse();
      
      await authorizationServer.getDeviceAuthorizationStatus(req, res);
      
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.error).toBe('invalid_request');
    });
    
    it('should return error for unknown device code', async () => {
      const req = createMockRequest({}, { device_code: 'invalid_device_code' });
      const res = createMockResponse();
      
      await authorizationServer.getDeviceAuthorizationStatus(req, res);
      
      expect(res.statusCode).toBe(404);
      expect(res.jsonData.error).toBe('invalid_device_code');
    });
    
    it('should not expose sensitive device code data', async () => {
      // Create device authorization
      const createReq = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai'
      });
      const createRes = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(createReq, createRes);
      
      // Get status
      const statusReq = createMockRequest({}, { device_code: createRes.jsonData.device_code });
      const statusRes = createMockResponse();
      await authorizationServer.getDeviceAuthorizationStatus(statusReq, statusRes);
      
      // Should not expose sensitive fields
      expect(statusRes.jsonData).not.toHaveProperty('device_code');
      expect(statusRes.jsonData).not.toHaveProperty('user_code');
      expect(statusRes.jsonData).not.toHaveProperty('client_id');
    });
  });
  
  describe('cleanupExpiredCodes', () => {
    it('should remove expired device codes', () => {
      // Manually insert an expired code
      const expiredCode = 'expired_device_code';
      authorizationServer._internals.storeDeviceAuthorization({
        device_code: expiredCode,
        client_id: 'test',
        provider_id: 'openai',
        expires_in: -1 // Already expired
      });
      
      // Manually set created_at to past
      const stored = authorizationServer._internals.deviceCodeStore.get(expiredCode);
      stored.created_at = Date.now() - 1000000; // Way in the past
      
      const count = authorizationServer.cleanupExpiredCodes();
      
      expect(count).toBe(1);
      expect(authorizationServer._internals.deviceCodeStore.has(expiredCode)).toBe(false);
    });
    
    it('should preserve active device codes', () => {
      // Create active code
      const activeCode = 'active_device_code';
      authorizationServer._internals.storeDeviceAuthorization({
        device_code: activeCode,
        client_id: 'test',
        provider_id: 'openai',
        expires_in: 900
      });
      
      const count = authorizationServer.cleanupExpiredCodes();
      
      expect(count).toBe(0);
      expect(authorizationServer._internals.deviceCodeStore.has(activeCode)).toBe(true);
    });
    
    it('should handle mixed expired and active codes', () => {
      // Create multiple codes
      const codes = [
        { device_code: 'active1', expires_in: 900 },
        { device_code: 'expired1', expires_in: -1 },
        { device_code: 'active2', expires_in: 900 },
        { device_code: 'expired2', expires_in: -1 }
      ];
      
      for (const code of codes) {
        authorizationServer._internals.storeDeviceAuthorization({
          ...code,
          client_id: 'test',
          provider_id: 'openai'
        });
        
        if (code.expires_in < 0) {
          const stored = authorizationServer._internals.deviceCodeStore.get(code.device_code);
          stored.created_at = Date.now() - 1000000;
        }
      }
      
      const count = authorizationServer.cleanupExpiredCodes();
      
      expect(count).toBe(2); // Only expired removed
      expect(authorizationServer._internals.deviceCodeStore.size).toBe(2);
      expect(authorizationServer._internals.deviceCodeStore.has('active1')).toBe(true);
      expect(authorizationServer._internals.deviceCodeStore.has('active2')).toBe(true);
    });
  });
  
  describe('RFC 8628 Compliance', () => {
    it('should return all required response fields', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      // RFC 8628 required fields
      expect(res.jsonData).toHaveProperty('device_code');
      expect(res.jsonData).toHaveProperty('user_code');
      expect(res.jsonData).toHaveProperty('verification_uri');
      expect(res.jsonData).toHaveProperty('expires_in');
      
      // RFC 8628 optional but recommended fields
      expect(res.jsonData).toHaveProperty('verification_uri_complete');
      expect(res.jsonData).toHaveProperty('interval');
    });
    
    it('should use standard error codes', async () => {
      // Test invalid_request
      let req = createMockRequest({ provider_id: 'openai' });
      let res = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      expect(res.jsonData.error).toBe('invalid_request');
      
      // Test invalid_scope
      req = createMockRequest({
        client_id: 'test',
        provider_id: 'openai',
        scope: 'invalid_scope'
      });
      res = createMockResponse();
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      expect(res.jsonData.error).toBe('invalid_scope');
    });
  });
  
  describe('Security Properties', () => {
    it('should generate unique device codes', async () => {
      const deviceCodes = new Set();
      
      for (let i = 0; i < 100; i++) {
        const req = createMockRequest({
          client_id: 'test_client',
          provider_id: 'openai'
        });
        const res = createMockResponse();
        
        await authorizationServer.handleDeviceAuthorizationRequest(req, res);
        
        const deviceCode = res.jsonData.device_code;
        expect(deviceCodes.has(deviceCode)).toBe(false);
        deviceCodes.add(deviceCode);
      }
    });
    
    it('should store device codes with pending state', async () => {
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      const deviceCode = res.jsonData.device_code;
      const stored = authorizationServer._internals.getDeviceAuthorization(deviceCode);
      
      expect(stored.state).toBe('pending');
      expect(stored.poll_count).toBe(0);
    });
    
    it('should include timestamp metadata', async () => {
      const beforeTime = Date.now();
      
      const req = createMockRequest({
        client_id: 'test_client',
        provider_id: 'openai'
      });
      const res = createMockResponse();
      
      await authorizationServer.handleDeviceAuthorizationRequest(req, res);
      
      const afterTime = Date.now();
      const deviceCode = res.jsonData.device_code;
      const stored = authorizationServer._internals.getDeviceAuthorization(deviceCode);
      
      expect(stored.created_at).toBeGreaterThanOrEqual(beforeTime);
      expect(stored.created_at).toBeLessThanOrEqual(afterTime);
    });
  });
});
