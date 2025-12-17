import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { registerUser, loginUser, registerDoctor, loginDoctor, validateToken } from '../services/auth.js';

const router: ExpressRouter = Router();

/**
 * POST /api/auth/user/register
 * Register a new user
 */
router.post('/user/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    
    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }
    
    // Register user
    const user = await registerUser(email, password);
    
    // Return user without password hash
    res.status(201).json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    // Handle duplicate email error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/user/login
 * Login a user
 */
router.post('/user/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Login user
    const { token, user } = await loginUser(email, password);
    
    // Return token and user without password hash
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/user/validate
 * Validate a JWT token
 */
router.get('/user/validate', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const payload = validateToken(token);
    
    // Verify it's a user token
    if (payload.type !== 'user') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    
    res.json({
      valid: true,
      user: {
        id: payload.id,
        email: payload.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/doctor/register
 * Register a new doctor
 */
router.post('/doctor/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    
    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }
    
    // Register doctor
    const doctor = await registerDoctor(email, password);
    
    // Return doctor without password hash
    res.status(201).json({
      id: doctor.id,
      email: doctor.email,
      createdAt: doctor.createdAt,
    });
  } catch (error) {
    // Handle duplicate email error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/doctor/login
 * Login a doctor
 */
router.post('/doctor/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Login doctor
    const { token, doctor } = await loginDoctor(email, password);
    
    // Return token and doctor without password hash
    res.json({
      token,
      doctor: {
        id: doctor.id,
        email: doctor.email,
        createdAt: doctor.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/doctor/validate
 * Validate a doctor JWT token
 */
router.get('/doctor/validate', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const payload = validateToken(token);
    
    // Verify it's a doctor token
    if (payload.type !== 'doctor') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    
    res.json({
      valid: true,
      doctor: {
        id: payload.id,
        email: payload.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
