import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { createRoom, getRoom, joinRoomAsDoctor } from '../services/room.js';
import { validateToken } from '../services/auth.js';

const router: ExpressRouter = Router();

/**
 * POST /api/rooms
 * Create a new anonymous room (patient creates room)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Create room without requiring authentication (anonymous patient)
    const room = await createRoom();
    
    // Return room ID and cipher key
    res.status(201).json({
      roomId: room.id,
      cipherKey: room.cipherKey,
      createdAt: room.createdAt,
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get room details by room ID
 */
router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    // Validate roomId format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      res.status(400).json({ error: 'Invalid room ID format' });
      return;
    }
    
    // Get room
    const room = await getRoom(roomId);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    // Return room details (excluding cipher key for security)
    res.json({
      roomId: room.id,
      doctorId: room.doctorId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Doctor joins a room with JWT authentication
 */
router.post('/:roomId/join', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    // Validate roomId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      res.status(400).json({ error: 'Invalid room ID format' });
      return;
    }
    
    // Extract and validate JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    let payload;
    try {
      payload = validateToken(token);
    } catch (error) {
      if (error instanceof Error && (error.message === 'Token expired' || error.message === 'Invalid token')) {
        res.status(401).json({ error: error.message });
        return;
      }
      throw error;
    }
    
    // Verify it's a doctor token
    if (payload.type !== 'doctor') {
      res.status(403).json({ error: 'Only doctors can join rooms' });
      return;
    }
    
    // Join room as doctor
    await joinRoomAsDoctor(roomId, payload.id);
    
    // Get updated room details
    const room = await getRoom(roomId);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    // Return success with room details and cipher key
    res.json({
      success: true,
      roomId: room.id,
      cipherKey: room.cipherKey,
      doctorId: room.doctorId,
      joinedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Room not found') {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
      if (error.message === 'Room already has a doctor assigned') {
        res.status(409).json({ error: 'Room already has a doctor assigned' });
        return;
      }
    }
    
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
