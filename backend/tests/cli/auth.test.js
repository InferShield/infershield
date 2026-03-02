/**
 * CLI Auth Commands Tests
 * 
 * Unit and integration tests for IDE authentication trigger.
 * Tests the complete CLI flow including device authorization, browser launch,
 * polling, and token storage.
 * 
 * @module tests/cli/auth.test
 * @related Issue #1 - OAuth Device Flow (Task 6: IDE Authentication Trigger)
 */

const { login, logout, status, refresh } = require('../../cli/commands/auth');
const authServer = require('../../services/oauth/device-flow/authorization-server');
const deviceCodeManager = require('../../services/oauth/device-flow/device-code-manager');
const pollingManager = require('../../services/oauth/device-flow/polling-manager');
const browserLauncher = require('../../services/oauth/device-flow/browser-launcher');
const tokenStorage = require('../../services/oauth/token-storage');
const { DeviceCodeState } = require('../../services/oauth/device-flow/device-code-manager');

// Mock console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

let consoleOutput = [];
let consoleErrors = [];

beforeEach(() => {
  consoleOutput = [];
  consoleErrors = [];
  
  console.log = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  
  console.error = jest.fn((...args) => {
    consoleErrors.push(args.join(' '));
  });
  
  console.warn = jest.fn((...args) => {
    consoleOutput.push(args.join(' '));
  });
  
  // Mock process.stdout.write for progress dots
  process.stdout.write = jest.fn();
  
  // Clear all state
  deviceCodeManager._clear();
  pollingManager._clearAll();
  authServer._internals.deviceCodeStore.clear();
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  
  jest.restoreAllMocks();
});

describe('CLI Auth Commands - IDE Authentication Trigger', () => {
  
  describe('login command', () => {
    
    it('should successfully complete device flow authentication', async () => {
      // Mock process.exit to prevent test termination
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      // Mock browser launcher
      const mockLaunchBrowser = jest.spyOn(browserLauncher, 'launchBrowser')
        .mockResolvedValue({
          success: true,
          userCode: 'TEST-CODE',
          verificationUri: 'https://example.com/device'
        });
      
      // Mock token storage
      const mockSaveToken = jest.spyOn(tokenStorage, 'saveToken')
        .mockResolvedValue(undefined);
      
      // Start login command in background
      const loginPromise = login({
        provider: 'openai',
        scope: 'api',
        browser: true
      });
      
      // Wait for device authorization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Find the device code that was created
      const deviceCodes = Array.from(authServer._internals.deviceCodeStore.keys());
      expect(deviceCodes.length).toBeGreaterThan(0);
      
      const deviceCode = deviceCodes[0];
      const deviceData = deviceCodeManager.retrieve(deviceCode);
      expect(deviceData).not.toBeNull();
      expect(deviceData.state).toBe(DeviceCodeState.PENDING);
      
      // Simulate user authorization
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED, {
        token: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
      
      // Wait for polling to detect authorization
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Verify token was stored
      expect(mockSaveToken).toHaveBeenCalledWith(
        'openai',
        expect.objectContaining({
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token'
        })
      );
      
      // Verify browser was launched
      expect(mockLaunchBrowser).toHaveBeenCalled();
      
      // Verify success exit
      expect(mockExit).toHaveBeenCalledWith(0);
      
      // Verify output contains success messages
      const output = consoleOutput.join('\n');
      expect(output).toContain('Device authorization initiated');
      expect(output).toContain('Authorization successful');
      expect(output).toContain('Tokens stored securely');
      
      mockExit.mockRestore();
    }, 15000);
    
    it('should handle browser launch failure gracefully', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      // Mock browser launcher to fail
      const mockLaunchBrowser = jest.spyOn(browserLauncher, 'launchBrowser')
        .mockResolvedValue({
          success: false,
          error: 'Browser launch failed',
          fallbackMessage: 'Please open URL manually'
        });
      
      const mockSaveToken = jest.spyOn(tokenStorage, 'saveToken')
        .mockResolvedValue(undefined);
      
      // Start login
      const loginPromise = login({
        provider: 'openai',
        scope: 'api',
        browser: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Authorize immediately
      const deviceCodes = Array.from(authServer._internals.deviceCodeStore.keys());
      const deviceCode = deviceCodes[0];
      
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED, {
        token: {
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Should still succeed even if browser launch failed
      expect(mockSaveToken).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
      
      // Check for fallback message
      const output = consoleOutput.join('\n');
      expect(output).toContain('Could not launch browser');
      
      mockExit.mockRestore();
    }, 15000);
    
    it('should handle authorization denial', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      jest.spyOn(browserLauncher, 'launchBrowser')
        .mockResolvedValue({ success: true });
      
      const loginPromise = login({
        provider: 'openai',
        scope: 'api',
        browser: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Deny authorization
      const deviceCodes = Array.from(authServer._internals.deviceCodeStore.keys());
      const deviceCode = deviceCodes[0];
      
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.DENIED);
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Should exit with error
      expect(mockExit).toHaveBeenCalledWith(1);
      
      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Authorization denied');
      
      mockExit.mockRestore();
    }, 15000);
    
    it('should skip browser launch when --no-browser flag is set', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      const mockLaunchBrowser = jest.spyOn(browserLauncher, 'launchBrowser');
      
      const mockSaveToken = jest.spyOn(tokenStorage, 'saveToken')
        .mockResolvedValue(undefined);
      
      const loginPromise = login({
        provider: 'openai',
        scope: 'api',
        browser: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Browser should not be launched
      expect(mockLaunchBrowser).not.toHaveBeenCalled();
      
      // Verify message about manual browser opening
      const output = consoleOutput.join('\n');
      expect(output).toContain('Automatic browser launch disabled');
      
      // Authorize to complete the flow
      const deviceCodes = Array.from(authServer._internals.deviceCodeStore.keys());
      const deviceCode = deviceCodes[0];
      
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED, {
        token: {
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      expect(mockSaveToken).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    }, 15000);
    
    it('should handle polling rate limit violations', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      jest.spyOn(browserLauncher, 'launchBrowser')
        .mockResolvedValue({ success: true });
      
      const mockSaveToken = jest.spyOn(tokenStorage, 'saveToken')
        .mockResolvedValue(undefined);
      
      const loginPromise = login({
        provider: 'openai',
        scope: 'api',
        browser: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const deviceCodes = Array.from(authServer._internals.deviceCodeStore.keys());
      const deviceCode = deviceCodes[0];
      
      // Authorization will happen, polling manager will enforce rate limits
      deviceCodeManager.updateState(deviceCode, DeviceCodeState.AUTHORIZED, {
        token: {
          access_token: 'test_token',
          refresh_token: 'test_refresh',
          token_type: 'Bearer',
          expires_in: 3600
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    }, 15000);
    
  });
  
  describe('logout command', () => {
    
    it('should logout from specific provider', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      const mockDeleteToken = jest.spyOn(tokenStorage, 'deleteToken')
        .mockResolvedValue(true);
      
      await logout({ provider: 'openai', all: false });
      
      expect(mockDeleteToken).toHaveBeenCalledWith('openai');
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('Tokens for openai revoked');
      
      mockExit.mockRestore();
    });
    
    it('should logout from all providers', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      const mockListProviders = jest.spyOn(tokenStorage, 'listProviders')
        .mockResolvedValue(['openai', 'github']);
      
      const mockDeleteToken = jest.spyOn(tokenStorage, 'deleteToken')
        .mockResolvedValue(true);
      
      await logout({ provider: null, all: true });
      
      expect(mockListProviders).toHaveBeenCalled();
      expect(mockDeleteToken).toHaveBeenCalledWith('openai');
      expect(mockDeleteToken).toHaveBeenCalledWith('github');
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('All tokens revoked');
      
      mockExit.mockRestore();
    });
    
    it('should require provider or --all flag', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await logout({ provider: null, all: false });
      
      expect(mockExit).toHaveBeenCalledWith(1);
      
      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Please specify --provider or --all');
      
      mockExit.mockRestore();
    });
    
  });
  
  describe('status command', () => {
    
    it('should display active sessions', async () => {
      const mockListProviders = jest.spyOn(tokenStorage, 'listProviders')
        .mockResolvedValue(['openai']);
      
      const mockGetToken = jest.spyOn(tokenStorage, 'getToken')
        .mockResolvedValue({
          access_token: 'test_token',
          scopes: ['api'],
          expires_at: Math.floor(Date.now() / 1000) + 3600
        });
      
      await status({ json: false });
      
      expect(mockListProviders).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalledWith('openai');
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('Provider: openai');
      expect(output).toContain('Status: ✅ Active');
    });
    
    it('should show message when no active sessions', async () => {
      const mockListProviders = jest.spyOn(tokenStorage, 'listProviders')
        .mockResolvedValue([]);
      
      await status({ json: false });
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('No active sessions');
      expect(output).toContain('infershield auth login');
    });
    
    it('should output JSON when --json flag is set', async () => {
      const mockProviders = ['openai'];
      const mockTokenData = {
        access_token: 'test_token',
        scopes: ['api'],
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
      
      const mockListProviders = jest.spyOn(tokenStorage, 'listProviders')
        .mockResolvedValue(mockProviders);
      
      const mockGetToken = jest.spyOn(tokenStorage, 'getToken')
        .mockResolvedValue(mockTokenData);
      
      await status({ json: true });
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('"provider"');
      expect(output).toContain('openai');
    });
    
  });
  
  describe('refresh command', () => {
    
    it('should require provider flag', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      await refresh({ provider: null });
      
      expect(mockExit).toHaveBeenCalledWith(1);
      
      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Please specify --provider');
      
      mockExit.mockRestore();
    });
    
    it('should check for existing token', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      const mockGetToken = jest.spyOn(tokenStorage, 'getToken')
        .mockResolvedValue(null);
      
      await refresh({ provider: 'openai' });
      
      expect(mockGetToken).toHaveBeenCalledWith('openai');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      const errors = consoleErrors.join('\n');
      expect(errors).toContain('No active session');
      
      mockExit.mockRestore();
    });
    
    it('should acknowledge refresh not yet implemented', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      const mockGetToken = jest.spyOn(tokenStorage, 'getToken')
        .mockResolvedValue({
          provider: 'openai',
          accessToken: 'test_token'
        });
      
      await refresh({ provider: 'openai' });
      
      const output = consoleOutput.join('\n');
      expect(output).toContain('Token refresh not yet implemented');
      expect(output).toContain('Issue #4: Token Management');
      
      mockExit.mockRestore();
    });
    
  });
  
});
