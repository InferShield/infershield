/**
 * Browser Launcher Tests
 * 
 * Tests for OAuth device flow browser launcher.
 * 
 * @jest-environment node
 */

const browserLauncher = require('../../../services/oauth/device-flow/browser-launcher');
const { exec } = require('child_process');
const os = require('os');

// Mock child_process
jest.mock('child_process');
jest.mock('os');

describe('BrowserLauncher', () => {
  let originalPlatform;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Save original platform
    originalPlatform = os.platform;
    
    // Mock console methods to avoid clutter in test output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // Restore os.platform
    os.platform = originalPlatform;
  });

  describe('launchBrowser', () => {
    const testUri = 'https://example.com/device';
    const testCode = 'ABCD-1234';

    describe('successful browser launch', () => {
      it('should launch browser on macOS', async () => {
        os.platform.mockReturnValue('darwin');
        
        // Mock successful exec
        exec.mockImplementation((cmd, callback) => {
          callback(null, '', '');
        });

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result).toEqual({
          success: true,
          userCode: testCode,
          verificationUri: testUri
        });
        
        expect(exec).toHaveBeenCalledWith(
          `open "${testUri}"`,
          expect.any(Function)
        );
      });

      it('should launch browser on Linux', async () => {
        os.platform.mockReturnValue('linux');
        
        exec.mockImplementation((cmd, callback) => {
          callback(null, '', '');
        });

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result.success).toBe(true);
        expect(exec).toHaveBeenCalledWith(
          `xdg-open "${testUri}"`,
          expect.any(Function)
        );
      });

      it('should launch browser on Windows', async () => {
        os.platform.mockReturnValue('win32');
        
        exec.mockImplementation((cmd, callback) => {
          callback(null, '', '');
        });

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result.success).toBe(true);
        // Windows 'start' command requires empty title
        expect(exec).toHaveBeenCalledWith(
          `start "" "${testUri}"`,
          expect.any(Function)
        );
      });

      it('should display user code and verification URL', async () => {
        os.platform.mockReturnValue('darwin');
        
        exec.mockImplementation((cmd, callback) => {
          callback(null, '', '');
        });

        await browserLauncher.launchBrowser(testUri, testCode);

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(testCode)
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(testUri)
        );
      });
    });

    describe('failed browser launch', () => {
      it('should handle browser launch failure gracefully', async () => {
        os.platform.mockReturnValue('darwin');
        
        const mockError = new Error('Browser not found');
        exec.mockImplementation((cmd, callback) => {
          callback(mockError, '', '');
        });

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result).toMatchObject({
          success: false,
          error: 'Browser not found',
          userCode: testCode,
          verificationUri: testUri
        });
        expect(result.fallbackMessage).toBeDefined();
      });

      it('should display fallback message on browser launch failure', async () => {
        os.platform.mockReturnValue('darwin');
        
        exec.mockImplementation((cmd, callback) => {
          callback(new Error('Failed'), '', '');
        });

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result.fallbackMessage).toContain(testUri);
        expect(result.fallbackMessage).toContain(testCode);
        expect(result.fallbackMessage).toContain('Manual Authorization Required');
      });

      it('should handle unsupported platform', async () => {
        os.platform.mockReturnValue('freebsd');

        const result = await browserLauncher.launchBrowser(testUri, testCode);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unsupported platform');
      });
    });
  });

  describe('_getBrowserCommand', () => {
    it('should return "open" for macOS', () => {
      os.platform.mockReturnValue('darwin');
      
      const command = browserLauncher._getBrowserCommand();
      
      expect(command).toBe('open');
    });

    it('should return "xdg-open" for Linux', () => {
      os.platform.mockReturnValue('linux');
      
      const command = browserLauncher._getBrowserCommand();
      
      expect(command).toBe('xdg-open');
    });

    it('should return "start" for Windows', () => {
      os.platform.mockReturnValue('win32');
      
      const command = browserLauncher._getBrowserCommand();
      
      expect(command).toBe('start');
    });

    it('should throw error for unsupported platform', () => {
      os.platform.mockReturnValue('freebsd');
      
      expect(() => {
        browserLauncher._getBrowserCommand();
      }).toThrow('Unsupported platform: freebsd');
    });
  });

  describe('_buildCommand', () => {
    const testUrl = 'https://example.com/auth';

    it('should build command for macOS', () => {
      os.platform.mockReturnValue('darwin');
      
      const command = browserLauncher._buildCommand('open', testUrl);
      
      expect(command).toBe(`open "${testUrl}"`);
    });

    it('should build command for Linux', () => {
      os.platform.mockReturnValue('linux');
      
      const command = browserLauncher._buildCommand('xdg-open', testUrl);
      
      expect(command).toBe(`xdg-open "${testUrl}"`);
    });

    it('should build command for Windows with empty title', () => {
      os.platform.mockReturnValue('win32');
      
      const command = browserLauncher._buildCommand('start', testUrl);
      
      expect(command).toBe(`start "" "${testUrl}"`);
    });

    it('should properly quote URLs with special characters', () => {
      os.platform.mockReturnValue('darwin');
      
      const urlWithParams = 'https://example.com/auth?code=ABCD&state=xyz';
      const command = browserLauncher._buildCommand('open', urlWithParams);
      
      expect(command).toContain('"https://example.com/auth?code=ABCD&state=xyz"');
    });
  });

  describe('_formatFallbackMessage', () => {
    it('should include verification URI in fallback message', () => {
      const uri = 'https://example.com/device';
      const code = 'TEST-1234';
      
      const message = browserLauncher._formatFallbackMessage(uri, code);
      
      expect(message).toContain(uri);
    });

    it('should include user code in fallback message', () => {
      const uri = 'https://example.com/device';
      const code = 'TEST-1234';
      
      const message = browserLauncher._formatFallbackMessage(uri, code);
      
      expect(message).toContain(code);
    });

    it('should include manual authorization instructions', () => {
      const uri = 'https://example.com/device';
      const code = 'TEST-1234';
      
      const message = browserLauncher._formatFallbackMessage(uri, code);
      
      expect(message).toContain('Manual Authorization Required');
      expect(message).toContain('Open your browser');
      expect(message).toContain('Navigate to');
      expect(message).toContain('Enter the code');
    });
  });

  describe('integration scenarios', () => {
    it('should handle network URLs correctly', async () => {
      os.platform.mockReturnValue('linux');
      
      exec.mockImplementation((cmd, callback) => {
        callback(null, '', '');
      });

      const networkUrl = 'https://auth.example.com/device?client_id=abc123';
      const result = await browserLauncher.launchBrowser(networkUrl, 'CODE');

      expect(result.success).toBe(true);
      expect(result.verificationUri).toBe(networkUrl);
    });

    it('should handle localhost URLs correctly', async () => {
      os.platform.mockReturnValue('darwin');
      
      exec.mockImplementation((cmd, callback) => {
        callback(null, '', '');
      });

      const localhostUrl = 'http://localhost:3000/auth';
      const result = await browserLauncher.launchBrowser(localhostUrl, 'LOCAL');

      expect(result.success).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        `open "${localhostUrl}"`,
        expect.any(Function)
      );
    });

    it('should handle timeout in browser launch', async () => {
      os.platform.mockReturnValue('darwin');
      
      exec.mockImplementation((cmd, callback) => {
        // Simulate timeout
        setTimeout(() => {
          callback(new Error('Command timed out'), '', '');
        }, 100);
      });

      const result = await browserLauncher.launchBrowser(
        'https://example.com/device',
        'TIMEOUT'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('error handling', () => {
    it('should handle permission denied errors', async () => {
      os.platform.mockReturnValue('linux');
      
      exec.mockImplementation((cmd, callback) => {
        callback(new Error('EACCES: permission denied'), '', '');
      });

      const result = await browserLauncher.launchBrowser(
        'https://example.com/device',
        'PERM'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
      expect(result.fallbackMessage).toBeDefined();
    });

    it('should handle browser not installed errors', async () => {
      os.platform.mockReturnValue('linux');
      
      exec.mockImplementation((cmd, callback) => {
        callback(new Error('xdg-open: command not found'), '', '');
      });

      const result = await browserLauncher.launchBrowser(
        'https://example.com/device',
        'NOBROWSER'
      );

      expect(result.success).toBe(false);
      expect(result.fallbackMessage).toContain('Manual Authorization Required');
    });
  });
});
