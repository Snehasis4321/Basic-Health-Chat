import { generateCipherKey, encryptMessage, decryptMessage } from './encryption.js';

describe('Encryption Service', () => {
  describe('generateCipherKey', () => {
    it('should generate a 44-character base64 string (32 bytes)', () => {
      const key = generateCipherKey();
      expect(key).toHaveLength(44);
      expect(key).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateCipherKey();
      const key2 = generateCipherKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptMessage and decryptMessage', () => {
    it('should encrypt and decrypt a message correctly', () => {
      const message = 'Hello, this is a test message';
      const key = generateCipherKey();
      
      const encrypted = encryptMessage(message, key);
      const decrypted = decryptMessage(encrypted, key);
      
      expect(decrypted).toBe(message);
    });

    it('should produce different encrypted outputs for the same message', () => {
      const message = 'Same message';
      const key = generateCipherKey();
      
      const encrypted1 = encryptMessage(message, key);
      const encrypted2 = encryptMessage(message, key);
      
      // Different IVs should produce different encrypted outputs
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same message
      expect(decryptMessage(encrypted1, key)).toBe(message);
      expect(decryptMessage(encrypted2, key)).toBe(message);
    });

    it('should handle empty strings', () => {
      const message = '';
      const key = generateCipherKey();
      
      const encrypted = encryptMessage(message, key);
      const decrypted = decryptMessage(encrypted, key);
      
      expect(decrypted).toBe(message);
    });

    it('should handle special characters and unicode', () => {
      const message = 'Hello 世界! 🌍 Special chars: @#$%^&*()';
      const key = generateCipherKey();
      
      const encrypted = encryptMessage(message, key);
      const decrypted = decryptMessage(encrypted, key);
      
      expect(decrypted).toBe(message);
    });

    it('should throw error for invalid encrypted message format', () => {
      const key = generateCipherKey();
      const invalidEncrypted = 'invalid-format-without-colon';
      
      expect(() => decryptMessage(invalidEncrypted, key)).toThrow('Invalid encrypted message format');
    });

    it('should fail to decrypt with wrong key', () => {
      const message = 'Secret message';
      const key1 = generateCipherKey();
      const key2 = generateCipherKey();
      
      const encrypted = encryptMessage(message, key1);
      
      expect(() => decryptMessage(encrypted, key2)).toThrow();
    });
  });
});
