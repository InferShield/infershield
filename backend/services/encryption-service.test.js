const encryptionService = require('../services/encryption-service');

describe('EncryptionService', () => {
  let testKey;

  beforeEach(() => {
    testKey = encryptionService.generateKey();
  });

  describe('generateKey', () => {
    it('should generate a 256-bit key', () => {
      expect(testKey).toBeInstanceOf(Buffer);
      expect(testKey.length).toBe(32);
    });

    it('should generate unique keys', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text', () => {
      const plaintext = 'Sensitive compliance data';
      const encrypted = encryptionService.encrypt(plaintext, testKey);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = encryptionService.decrypt(encrypted, testKey);
      expect(decrypted.toString('utf8')).toBe(plaintext);
    });

    it('should encrypt and decrypt binary data', () => {
      const data = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      const encrypted = encryptionService.encrypt(data, testKey);
      const decrypted = encryptionService.decrypt(encrypted, testKey);
      
      expect(decrypted.equals(data)).toBe(true);
    });

    it('should fail with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = encryptionService.encrypt(plaintext, testKey);
      const wrongKey = encryptionService.generateKey();

      expect(() => {
        encryptionService.decrypt(encrypted, wrongKey);
      }).toThrow();
    });

    it('should fail with tampered ciphertext', () => {
      const plaintext = 'Secret data';
      const encrypted = encryptionService.encrypt(plaintext, testKey);
      
      // Tamper with encrypted data
      encrypted.encrypted[0] ^= 0xFF;

      expect(() => {
        encryptionService.decrypt(encrypted, wrongKey);
      }).toThrow();
    });

    it('should reject invalid key length', () => {
      const shortKey = Buffer.from('short');
      
      expect(() => {
        encryptionService.encrypt('test', shortKey);
      }).toThrow('Encryption key must be 32 bytes');
    });
  });

  describe('encryptFile/decryptFile', () => {
    it('should encrypt and decrypt file buffers', () => {
      const fileData = Buffer.from('PDF file contents...');
      const encrypted = encryptionService.encryptFile(fileData, testKey);
      const decrypted = encryptionService.decryptFile(encrypted, testKey);
      
      expect(decrypted.equals(fileData)).toBe(true);
    });
  });

  describe('deriveKeyFromPassword', () => {
    it('should derive consistent key from password', () => {
      const password = 'my-secure-password';
      const salt = Buffer.from('fixed-salt-12345');
      
      const key1 = encryptionService.deriveKeyFromPassword(password, salt);
      const key2 = encryptionService.deriveKeyFromPassword(password, salt);
      
      expect(key1.equals(key2)).toBe(true);
      expect(key1.length).toBe(32);
    });

    it('should produce different keys for different passwords', () => {
      const salt = Buffer.from('fixed-salt-12345');
      const key1 = encryptionService.deriveKeyFromPassword('password1', salt);
      const key2 = encryptionService.deriveKeyFromPassword('password2', salt);
      
      expect(key1.equals(key2)).toBe(false);
    });

    it('should produce different keys for different salts', () => {
      const password = 'same-password';
      const key1 = encryptionService.deriveKeyFromPassword(password, Buffer.from('salt1'));
      const key2 = encryptionService.deriveKeyFromPassword(password, Buffer.from('salt2'));
      
      expect(key1.equals(key2)).toBe(false);
    });
  });
});
