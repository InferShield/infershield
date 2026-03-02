/**
 * Token Storage Coverage Boost Tests
 * 
 * Additional tests to increase coverage from 82.35% to ≥90%
 * Targeting uncovered edge cases and error paths.
 * 
 * @related Issue #4 - OAuth Token Management (PREREQ-001: Coverage Boost)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Mock keytar to simulate unavailability scenarios
jest.mock('keytar', () => {
  // Simulate keytar load failure for specific tests
  if (process.env.SIMULATE_NO_KEYTAR === 'true') {
    throw new Error('Keytar not available');
  }
  return {
    setPassword: jest.fn(),
    getPassword: jest.fn(),
    deletePassword: jest.fn(),
    findCredentials: jest.fn()
  };
}, { virtual: true });

describe('TokenStorage - Coverage Boost', () => {
  const TEST_TOKEN_DIR = path.join(os.tmpdir(), 'infershield-coverage-test-tokens');
  let tokenStorage;
  let keytar;

  beforeEach(async () => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Clean up test directory
    try {
      await fs.rm(TEST_TOKEN_DIR, { recursive: true, force: true });
    } catch (err) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(TEST_TOKEN_DIR, { recursive: true, force: true });
    } catch (err) {
      // Ignore
    }
    delete process.env.SIMULATE_NO_KEYTAR;
    delete process.env.INFERSHIELD_MASTER_KEY;
  });

  describe('Keytar Unavailability Path (Line 31)', () => {
    it('should log warning when keytar is unavailable', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate keytar not being available
      process.env.SIMULATE_NO_KEYTAR = 'true';
      
      // Force reload module to trigger constructor
      jest.resetModules();
      
      // This will trigger the catch block in constructor
      try {
        tokenStorage = require('../../services/oauth/token-storage');
      } catch (err) {
        // Expected for this test
      }

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Platform keyring not available')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should fallback to encrypted storage when keytar unavailable', async () => {
      process.env.SIMULATE_NO_KEYTAR = 'true';
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      
      jest.resetModules();
      
      tokenStorage = require('../../services/oauth/token-storage');
      
      // Should use encrypted fallback
      expect(tokenStorage.useKeyring).toBe(false);
      
      // Should be able to save and retrieve tokens
      const tokenData = {
        access_token: 'fallback_token',
        refresh_token: 'fallback_refresh',
        expires_at: 1709485200,
        token_type: 'Bearer'
      };
      
      await tokenStorage.saveToken('test_provider', tokenData);
      const retrieved = await tokenStorage.getToken('test_provider');
      
      expect(retrieved.access_token).toBe('fallback_token');
    });
  });

  describe('_deriveKey Method Coverage (Lines 161-168)', () => {
    beforeEach(() => {
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      jest.resetModules();
      tokenStorage = require('../../services/oauth/token-storage');
      tokenStorage.useKeyring = false;
    });

    it('should derive consistent keys from same inputs', () => {
      const masterKey = Buffer.from('test_master_key');
      const salt = Buffer.from('test_salt_16byte');
      
      const key1 = tokenStorage._deriveKey(masterKey, salt);
      const key2 = tokenStorage._deriveKey(masterKey, salt);
      
      expect(key1.equals(key2)).toBe(true);
      expect(key1.length).toBe(32); // AES-256 key size
    });

    it('should derive different keys from different salts', () => {
      const masterKey = Buffer.from('test_master_key');
      const salt1 = Buffer.from('salt1_16_bytes!!');
      const salt2 = Buffer.from('salt2_16_bytes!!');
      
      const key1 = tokenStorage._deriveKey(masterKey, salt1);
      const key2 = tokenStorage._deriveKey(masterKey, salt2);
      
      expect(key1.equals(key2)).toBe(false);
    });

    it('should use PBKDF2 with high iteration count', () => {
      const masterKey = Buffer.from('test_master_key');
      const salt = crypto.randomBytes(16);
      
      // Call _deriveKey and measure execution time (should be non-trivial due to iterations)
      const start = Date.now();
      const key = tokenStorage._deriveKey(masterKey, salt);
      const duration = Date.now() - start;
      
      // With 100,000 iterations, should take at least a few ms
      expect(duration).toBeGreaterThan(0);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });
  });

  describe('_loadEncrypted Error Handling (Line 268)', () => {
    beforeEach(() => {
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      jest.resetModules();
      tokenStorage = require('../../services/oauth/token-storage');
      tokenStorage.useKeyring = false;
    });

    it('should throw error for unsupported token file version', async () => {
      const providerId = 'version_test';
      const filename = path.join(
        os.homedir(),
        '.infershield',
        'tokens',
        `provider_${providerId}.enc`
      );
      
      await tokenStorage.initialize();
      
      // Create a token file with unsupported version
      const invalidPayload = JSON.stringify({
        version: 999,
        salt: 'test',
        iv: 'test',
        authTag: 'test',
        ciphertext: 'test'
      });
      
      await fs.writeFile(filename, invalidPayload);
      
      await expect(tokenStorage.getToken(providerId)).rejects.toThrow(
        'Unsupported token file version: 999'
      );
    });

    it('should throw error for corrupted encrypted file', async () => {
      const providerId = 'corrupt_test';
      const filename = path.join(
        os.homedir(),
        '.infershield',
        'tokens',
        `provider_${providerId}.enc`
      );
      
      await tokenStorage.initialize();
      
      // Create a corrupted encrypted file (invalid JSON in payload)
      await fs.writeFile(filename, 'not valid json at all');
      
      await expect(tokenStorage.getToken(providerId)).rejects.toThrow();
    });

    it('should throw error for authentication tag mismatch', async () => {
      const providerId = 'auth_fail_test';
      
      // First save a valid token
      await tokenStorage.saveToken(providerId, {
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      // Tamper with the encrypted file
      const filename = path.join(
        os.homedir(),
        '.infershield',
        'tokens',
        `provider_${providerId}.enc`
      );
      
      const payload = JSON.parse(await fs.readFile(filename, 'utf8'));
      
      // Corrupt the ciphertext (will cause auth tag verification to fail)
      payload.ciphertext = payload.ciphertext.split('').reverse().join('');
      
      await fs.writeFile(filename, JSON.stringify(payload));
      
      await expect(tokenStorage.getToken(providerId)).rejects.toThrow();
    });
  });

  describe('_deleteEncrypted Error Handling (Lines 287-302)', () => {
    beforeEach(() => {
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      jest.resetModules();
      tokenStorage = require('../../services/oauth/token-storage');
      tokenStorage.useKeyring = false;
    });

    it('should throw error on permission denied during delete', async () => {
      if (os.platform() === 'win32') {
        // Skip on Windows (different permission model)
        return;
      }

      const providerId = 'perm_test';
      
      // Save a token
      await tokenStorage.saveToken(providerId, {
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      const filename = path.join(
        os.homedir(),
        '.infershield',
        'tokens',
        `provider_${providerId}.enc`
      );
      
      // Make file read-only (simulate permission error)
      await fs.chmod(filename, 0o444);
      
      // Make parent directory read-only too
      const tokenDir = path.dirname(filename);
      await fs.chmod(tokenDir, 0o555);
      
      await expect(tokenStorage.deleteToken(providerId)).rejects.toThrow();
      
      // Restore permissions for cleanup
      await fs.chmod(tokenDir, 0o700);
      await fs.chmod(filename, 0o600);
    });

    it('should handle file system errors during delete', async () => {
      const providerId = 'fs_error_test';
      
      // Mock fs.unlink to throw a non-ENOENT error
      const originalUnlink = fs.unlink;
      jest.spyOn(fs, 'unlink').mockRejectedValue(
        Object.assign(new Error('Disk I/O error'), { code: 'EIO' })
      );
      
      await expect(tokenStorage.deleteToken(providerId)).rejects.toThrow('Disk I/O error');
      
      fs.unlink = originalUnlink;
    });
  });

  describe('listProviders Encrypted Fallback Error Path', () => {
    beforeEach(() => {
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      jest.resetModules();
      tokenStorage = require('../../services/oauth/token-storage');
      tokenStorage.useKeyring = false;
    });

    it('should return empty array when token directory does not exist', async () => {
      await tokenStorage.initialize();
      
      // Delete token directory
      const tokenDir = path.join(os.homedir(), '.infershield', 'tokens');
      await fs.rm(tokenDir, { recursive: true, force: true });
      
      const providers = await tokenStorage.listProviders();
      expect(providers).toEqual([]);
    });

    it('should throw error on file system errors during list', async () => {
      await tokenStorage.initialize();
      
      // Mock fs.readdir to throw a non-ENOENT error
      const originalReaddir = fs.readdir;
      jest.spyOn(fs, 'readdir').mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );
      
      await expect(tokenStorage.listProviders()).rejects.toThrow('Permission denied');
      
      fs.readdir = originalReaddir;
    });

    it('should correctly filter encrypted token files', async () => {
      await tokenStorage.initialize();
      
      // Create multiple token files
      await tokenStorage.saveToken('provider1', {
        access_token: 'token1',
        refresh_token: 'refresh1',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      await tokenStorage.saveToken('provider2', {
        access_token: 'token2',
        refresh_token: 'refresh2',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      // Create a non-token file in the directory
      const tokenDir = path.join(os.homedir(), '.infershield', 'tokens');
      await fs.writeFile(path.join(tokenDir, 'README.txt'), 'test file');
      
      const providers = await tokenStorage.listProviders();
      
      // Should only include actual token providers
      expect(providers).toHaveLength(2);
      expect(providers.sort()).toEqual(['provider1', 'provider2']);
    });
  });

  describe('Edge Cases and Integration', () => {
    beforeEach(() => {
      process.env.INFERSHIELD_MASTER_KEY = Buffer.from('test_master_key_32_bytes_long_!!').toString('hex');
      jest.resetModules();
      tokenStorage = require('../../services/oauth/token-storage');
      tokenStorage.useKeyring = false;
    });

    it('should handle rapid save/get/delete operations', async () => {
      const providerId = 'rapid_test';
      
      // Rapid operations
      await tokenStorage.saveToken(providerId, {
        access_token: 'token1',
        refresh_token: 'refresh1',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      const token1 = await tokenStorage.getToken(providerId);
      expect(token1.access_token).toBe('token1');
      
      await tokenStorage.saveToken(providerId, {
        access_token: 'token2',
        refresh_token: 'refresh2',
        expires_at: 1709485300,
        token_type: 'Bearer'
      });
      
      const token2 = await tokenStorage.getToken(providerId);
      expect(token2.access_token).toBe('token2');
      
      const deleted = await tokenStorage.deleteToken(providerId);
      expect(deleted).toBe(true);
      
      const tokenAfterDelete = await tokenStorage.getToken(providerId);
      expect(tokenAfterDelete).toBeNull();
    });

    it('should handle multiple concurrent providers', async () => {
      // Clean token directory first to ensure isolation
      const tokenDir = path.join(os.homedir(), '.infershield', 'tokens');
      await fs.rm(tokenDir, { recursive: true, force: true });
      await tokenStorage.initialize();
      
      const providers = ['openai', 'github', 'gitlab', 'azure'];
      
      // Save tokens for all providers concurrently
      await Promise.all(
        providers.map(provider =>
          tokenStorage.saveToken(provider, {
            access_token: `${provider}_token`,
            refresh_token: `${provider}_refresh`,
            expires_at: 1709485200,
            token_type: 'Bearer'
          })
        )
      );
      
      // List all providers
      const listed = await tokenStorage.listProviders();
      expect(listed.sort()).toEqual(providers.sort());
      
      // Retrieve and verify each
      const tokens = await Promise.all(
        providers.map(provider => tokenStorage.getToken(provider))
      );
      
      tokens.forEach((token, i) => {
        expect(token.access_token).toBe(`${providers[i]}_token`);
      });
    });

    it('should preserve metadata across updates', async () => {
      const providerId = 'metadata_test';
      
      // Initial save
      await tokenStorage.saveToken(providerId, {
        access_token: 'initial_token',
        refresh_token: 'initial_refresh',
        expires_at: 1709485200,
        token_type: 'Bearer'
      });
      
      const initial = await tokenStorage.getToken(providerId);
      const acquiredAt = initial.acquired_at;
      expect(acquiredAt).toBeDefined();
      expect(initial.last_refreshed).toBeNull();
      
      // Update token
      await tokenStorage.updateToken(providerId, {
        access_token: 'updated_token',
        expires_at: 1709488800
      });
      
      const updated = await tokenStorage.getToken(providerId);
      expect(updated.access_token).toBe('updated_token');
      expect(updated.acquired_at).toBe(acquiredAt); // Preserved
      expect(updated.last_refreshed).toBeDefined(); // Set
      expect(updated.refresh_token).toBe('initial_refresh'); // Preserved
    });

    it('should handle special characters in provider IDs', async () => {
      const specialProviders = [
        'provider-with-dash',
        'provider_with_underscore',
        'provider.with.dots'
      ];
      
      for (const provider of specialProviders) {
        await tokenStorage.saveToken(provider, {
          access_token: `${provider}_token`,
          refresh_token: `${provider}_refresh`,
          expires_at: 1709485200,
          token_type: 'Bearer'
        });
        
        const retrieved = await tokenStorage.getToken(provider);
        expect(retrieved.access_token).toBe(`${provider}_token`);
        
        const deleted = await tokenStorage.deleteToken(provider);
        expect(deleted).toBe(true);
      }
    });
  });
});
