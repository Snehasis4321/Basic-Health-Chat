import { hashPassword, comparePassword } from './auth.js';

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // bcrypt uses random salts, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should produce bcrypt-formatted hash', async () => {
      const password = 'testPassword';
      const hash = await hashPassword(password);
      
      // bcrypt hashes start with $2b$ (or $2a$, $2y$)
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);
      
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should be case-sensitive', async () => {
      const password = 'Password123';
      const hash = await hashPassword(password);
      
      const resultCorrect = await comparePassword('Password123', hash);
      const resultWrong = await comparePassword('password123', hash);
      
      expect(resultCorrect).toBe(true);
      expect(resultWrong).toBe(false);
    });
  });
});
