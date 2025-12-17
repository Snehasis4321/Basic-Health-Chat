/**
 * Integration tests for user authentication
 * These tests require a running database connection
 * Run with: npm test -- auth.integration.test.ts
 */

import { registerUser, loginUser, validateToken, hashPassword, comparePassword } from './auth.js';
import pool from '../config/database.js';

describe('Auth Service Integration Tests', () => {
  // Clean up test users after tests
  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE 'test%@integration.test'");
    await pool.end();
  });

  describe('User Registration', () => {
    it('should register a new user with hashed password', async () => {
      const email = `test${Date.now()}@integration.test`;
      const password = 'testPassword123';

      const user = await registerUser(email, password);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(password);
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt format
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const email = `duplicate${Date.now()}@integration.test`;
      const password = 'testPassword123';

      // Register first user
      await registerUser(email, password);

      // Try to register with same email
      await expect(registerUser(email, password)).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    it('should login user with correct credentials and return JWT', async () => {
      const email = `login${Date.now()}@integration.test`;
      const password = 'correctPassword123';

      // Register user first
      await registerUser(email, password);

      // Login
      const result = await loginUser(email, password);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.id).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const email = `wrongpass${Date.now()}@integration.test`;
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword123';

      // Register user
      await registerUser(email, password);

      // Try to login with wrong password
      await expect(loginUser(email, wrongPassword)).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const email = 'nonexistent@integration.test';
      const password = 'somePassword123';

      await expect(loginUser(email, password)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate a valid JWT token', async () => {
      const email = `validate${Date.now()}@integration.test`;
      const password = 'testPassword123';

      // Register and login
      await registerUser(email, password);
      const { token } = await loginUser(email, password);

      // Validate token
      const payload = validateToken(token);

      expect(payload).toBeDefined();
      expect(payload.email).toBe(email);
      expect(payload.id).toBeDefined();
      expect(payload.type).toBe('user');
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => validateToken(invalidToken)).toThrow('Invalid token');
    });

    it('should reject expired JWT token', () => {
      // Create a token that's already expired
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'test-id', email: 'test@test.com', type: 'user' },
        process.env.JWT_SECRET || 'default-secret-change-in-production',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      expect(() => validateToken(expiredToken)).toThrow('Token expired');
    });
  });

  describe('Password Hashing', () => {
    it('should create different hashes for same password', async () => {
      const password = 'samePassword123';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      
      // Both should still validate
      expect(await comparePassword(password, hash1)).toBe(true);
      expect(await comparePassword(password, hash2)).toBe(true);
    });

    it('should validate correct password against hash', async () => {
      const password = 'myPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against hash', async () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
});
