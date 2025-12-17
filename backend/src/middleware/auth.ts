import { Request, Response, NextFunction } from 'express';
import { validateToken, JWTPayload } from '../services/auth.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate user requests
 * Validates JWT token and attaches user payload to request
 */
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
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
    
    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to authenticate doctor requests
 * Validates JWT token and attaches doctor payload to request
 */
export function authenticateDoctor(req: Request, res: Response, next: NextFunction): void {
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
    
    // Attach doctor to request
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
