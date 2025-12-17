import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;
const JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as string | number;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Doctor {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  id: string;
  email: string;
  type: 'user' | 'doctor';
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user
 * @param email - User email
 * @param password - Plain text password
 * @returns Created user object
 */
export async function registerUser(email: string, password: string): Promise<User> {
  // Hash the password
  const passwordHash = await hashPassword(password);
  
  // Insert user into database
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) 
     VALUES ($1, $2) 
     RETURNING id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`,
    [email, passwordHash]
  );
  
  return result.rows[0];
}

/**
 * Login a user and generate JWT token
 * @param email - User email
 * @param password - Plain text password
 * @returns JWT token and user object
 */
export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  // Find user by email
  const result = await pool.query(
    `SELECT id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt" 
     FROM users 
     WHERE email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = result.rows[0];
  
  // Compare password
  const isValid = await comparePassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // Generate JWT token
  const payload: JWTPayload = { id: user.id, email: user.email, type: 'user' };
  const token = jwt.sign(payload as object, JWT_SECRET, { expiresIn: '24h' });
  
  return { token, user };
}

/**
 * Validate a JWT token
 * @param token - JWT token to validate
 * @returns Decoded token payload
 */
export function validateToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

/**
 * Register a new doctor
 * @param email - Doctor email
 * @param password - Plain text password
 * @returns Created doctor object
 */
export async function registerDoctor(email: string, password: string): Promise<Doctor> {
  // Hash the password
  const passwordHash = await hashPassword(password);
  
  // Insert doctor into database
  const result = await pool.query(
    `INSERT INTO doctors (email, password_hash) 
     VALUES ($1, $2) 
     RETURNING id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`,
    [email, passwordHash]
  );
  
  return result.rows[0];
}

/**
 * Login a doctor and generate JWT token
 * @param email - Doctor email
 * @param password - Plain text password
 * @returns JWT token and doctor object
 */
export async function loginDoctor(email: string, password: string): Promise<{ token: string; doctor: Doctor }> {
  // Find doctor by email
  const result = await pool.query(
    `SELECT id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt" 
     FROM doctors 
     WHERE email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const doctor = result.rows[0];
  
  // Compare password
  const isValid = await comparePassword(password, doctor.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // Generate JWT token
  const payload: JWTPayload = { id: doctor.id, email: doctor.email, type: 'doctor' };
  const token = jwt.sign(payload as object, JWT_SECRET, { expiresIn: '24h' });
  
  return { token, doctor };
}
