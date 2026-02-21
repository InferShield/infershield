const crypto = require('crypto');

/**
 * Encryption service for sensitive compliance reports
 * Uses AES-256-GCM for authenticated encryption
 */
class EncryptionService {
  constructor() {
    // In production, load from secure environment variable
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a secure encryption key
   * @returns {Buffer} 256-bit encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {Buffer|string} data - Data to encrypt
   * @param {Buffer} key - 256-bit encryption key
   * @returns {Object} - Encrypted data with IV and auth tag
   */
  encrypt(data, key) {
    if (!Buffer.isBuffer(key) || key.length !== this.keyLength) {
      throw new Error(`Encryption key must be ${this.keyLength} bytes`);
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv,
      authTag,
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedData - Output from encrypt()
   * @param {Buffer} key - 256-bit encryption key
   * @returns {Buffer} - Decrypted data
   */
  decrypt(encryptedData, key) {
    if (!Buffer.isBuffer(key) || key.length !== this.keyLength) {
      throw new Error(`Decryption key must be ${this.keyLength} bytes`);
    }

    const { encrypted, iv, authTag, algorithm } = encryptedData;

    if (algorithm !== this.algorithm) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Encrypt a file (e.g., PDF report)
   * @param {Buffer} fileBuffer - File contents
   * @param {Buffer} key - 256-bit encryption key
   * @returns {Object} - Encrypted file with metadata
   */
  encryptFile(fileBuffer, key) {
    return this.encrypt(fileBuffer, key);
  }

  /**
   * Decrypt a file
   * @param {Object} encryptedFile - Encrypted file data
   * @param {Buffer} key - 256-bit encryption key
   * @returns {Buffer} - Decrypted file contents
   */
  decryptFile(encryptedFile, key) {
    return this.decrypt(encryptedFile, key);
  }

  /**
   * Derive a key from a password using PBKDF2
   * @param {string} password - User password
   * @param {Buffer} salt - Salt (16 bytes recommended)
   * @param {number} iterations - PBKDF2 iterations (100000+ recommended)
   * @returns {Buffer} - Derived key
   */
  deriveKeyFromPassword(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
  }
}

module.exports = new EncryptionService();
