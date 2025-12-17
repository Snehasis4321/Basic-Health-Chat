import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getMessages } from '../services/message.js';
import { getRoom } from '../services/room.js';

const router: ExpressRouter = Router();

/**
 * GET /api/rooms/:roomId/messages
 * Get message history for a room with pagination
 * Query params: limit (default 50), offset (default 0)
 */
router.get('/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Validate roomId format (basic UUID validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      res.status(400).json({ error: 'Invalid room ID format' });
      return;
    }
    
    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Limit must be between 1 and 100' });
      return;
    }
    
    if (offset < 0) {
      res.status(400).json({ error: 'Offset must be non-negative' });
      return;
    }
    
    // Get room to verify it exists and get cipher key
    const room = await getRoom(roomId);
    
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    // Get messages with decryption
    const messages = await getMessages({
      roomId,
      cipherKey: room.cipherKey,
      limit,
      offset,
    });
    
    // Return messages
    res.json({
      messages,
      pagination: {
        limit,
        offset,
        count: messages.length,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
