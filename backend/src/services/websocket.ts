import { Server, Socket } from 'socket.io';
import { validateToken, JWTPayload } from './auth.js';
import { exchangeKeys, leaveRoom as leaveRoomService } from './room.js';
import { sendMessage as sendMessageService } from './message.js';
import { translationService } from './translation.js';

export interface Session {
  socketId: string;
  roomId: string;
  role: 'patient' | 'doctor';
  doctorId: string | null;
  language: string;
  connectedAt: Date;
}

// In-memory session storage
// Key: socketId, Value: Session
const sessions = new Map<string, Session>();

// Track rooms and their participants
// Key: roomId, Value: Set of socketIds
const roomParticipants = new Map<string, Set<string>>();

// Track offline message queues
// Key: roomId, Value: Array of queued messages
interface QueuedMessage {
  content: string;
  senderRole: 'patient' | 'doctor';
  senderId: string | null;
  language: string;
  timestamp: Date;
}
const offlineMessageQueues = new Map<string, QueuedMessage[]>();

/**
 * Get session by socket ID
 * @param socketId - Socket ID
 * @returns Session or undefined if not found
 */
export function getSession(socketId: string): Session | undefined {
  return sessions.get(socketId);
}

/**
 * Create a new session
 * @param session - Session data
 */
export function createSession(session: Session): void {
  sessions.set(session.socketId, session);
  
  // Track room participants
  if (!roomParticipants.has(session.roomId)) {
    roomParticipants.set(session.roomId, new Set());
  }
  roomParticipants.get(session.roomId)!.add(session.socketId);
}

/**
 * Delete a session
 * @param socketId - Socket ID
 */
export function deleteSession(socketId: string): void {
  const session = sessions.get(socketId);
  if (session) {
    // Remove from room participants
    const participants = roomParticipants.get(session.roomId);
    if (participants) {
      participants.delete(socketId);
      if (participants.size === 0) {
        roomParticipants.delete(session.roomId);
      }
    }
  }
  sessions.delete(socketId);
}

/**
 * Get all sessions for a room
 * @param roomId - Room ID
 * @returns Array of sessions
 */
export function getRoomSessions(roomId: string): Session[] {
  const participants = roomParticipants.get(roomId);
  if (!participants) {
    return [];
  }
  
  const roomSessions: Session[] = [];
  for (const socketId of participants) {
    const session = sessions.get(socketId);
    if (session) {
      roomSessions.push(session);
    }
  }
  
  return roomSessions;
}

/**
 * Check if both patient and doctor are in a room
 * @param roomId - Room ID
 * @returns True if both are present
 */
export function areBothParticipantsPresent(roomId: string): boolean {
  const roomSessions = getRoomSessions(roomId);
  const hasPatient = roomSessions.some(s => s.role === 'patient');
  const hasDoctor = roomSessions.some(s => s.role === 'doctor');
  return hasPatient && hasDoctor;
}

/**
 * Authenticate WebSocket connection
 * Extracts and validates JWT token from handshake
 * @param socket - Socket.io socket
 * @returns JWT payload or null if authentication fails
 */
export function authenticateSocket(socket: Socket): JWTPayload | null {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    // Validate token
    const payload = validateToken(token);
    return payload;
  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Set up Socket.io server with authentication and connection handling
 * @param io - Socket.io server instance
 */
export function setupWebSocketServer(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle join_room event
    socket.on('join_room', async (data: { 
      roomId: string; 
      role: 'patient' | 'doctor'; 
      language?: string;
    }) => {
      try {
        const { roomId, role, language = 'en' } = data;
        
        // Validate room ID
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }
        
        // Validate role
        if (role !== 'patient' && role !== 'doctor') {
          socket.emit('error', { message: 'Invalid role' });
          return;
        }
        
        let doctorId: string | null = null;
        
        // If role is doctor, authenticate
        if (role === 'doctor') {
          const authPayload = authenticateSocket(socket);
          
          if (!authPayload || authPayload.type !== 'doctor') {
            socket.emit('error', { message: 'Doctor authentication required' });
            return;
          }
          
          doctorId = authPayload.id;
        }
        
        // Create session
        const session: Session = {
          socketId: socket.id,
          roomId,
          role,
          doctorId,
          language,
          connectedAt: new Date(),
        };
        
        createSession(session);
        
        // Join the Socket.io room
        socket.join(roomId);
        
        // Emit room_joined to the joining user
        socket.emit('room_joined', {
          roomId,
          role,
          doctorId,
        });
        
        // Notify other participants in the room
        socket.to(roomId).emit('user_joined', {
          role,
          doctorId,
        });
        
        console.log(`${role} joined room ${roomId}`, doctorId ? `(Doctor ID: ${doctorId})` : '');
        
        // Deliver any queued offline messages
        const queuedMessages = offlineMessageQueues.get(roomId);
        if (queuedMessages && queuedMessages.length > 0) {
          console.log(`Delivering ${queuedMessages.length} queued messages to ${role} in room ${roomId}`);
          
          for (const queuedMsg of queuedMessages) {
            socket.emit('new_message', {
              content: queuedMsg.content,
              senderRole: queuedMsg.senderRole,
              senderId: queuedMsg.senderId,
              language: queuedMsg.language,
              timestamp: queuedMsg.timestamp,
            });
          }
          
          // Clear the queue after delivery
          offlineMessageQueues.delete(roomId);
        }
        
        // Check if both participants are now present
        if (areBothParticipantsPresent(roomId)) {
          try {
            // Get cipher key from database
            const cipherKey = await exchangeKeys(roomId);
            
            // Send cipher key to all participants in the room
            io.to(roomId).emit('cipher_key_exchange', {
              cipherKey,
            });
            
            console.log(`Cipher keys exchanged for room ${roomId}`);
          } catch (error) {
            console.error('Error exchanging cipher keys:', error);
            socket.emit('error', { 
              message: 'Failed to exchange cipher keys' 
            });
          }
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to join room' 
        });
      }
    });
    
    // Handle send_message event
    socket.on('send_message', async (data: {
      content: string;
      language?: string;
      translatedContent?: string;
      targetLanguage?: string;
      isAudio?: boolean;
    }) => {
      try {
        const session = getSession(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const { roomId, role, doctorId } = session;
        const { 
          content, 
          language = 'en', 
          translatedContent,
          targetLanguage,
          isAudio = false 
        } = data;
        
        // Validate content
        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }
        
        // Get cipher key from room
        const cipherKey = await exchangeKeys(roomId);
        
        // Get other participants in the room to determine target language
        const roomSessions = getRoomSessions(roomId);
        const otherParticipants = roomSessions.filter(s => s.socketId !== socket.id);
        
        // Translate message for each recipient's language
        let finalTranslatedContent = translatedContent;
        let finalTargetLanguage = targetLanguage;
        let translationError = false;
        
        // If there are recipients, translate to their language
        if (otherParticipants.length > 0) {
          // For now, translate to the first recipient's language
          // In a multi-participant scenario, we'd need to handle multiple translations
          const recipientLanguage = otherParticipants[0].language;
          
          if (recipientLanguage && recipientLanguage !== language) {
            finalTargetLanguage = recipientLanguage;
            
            // Translate the message
            const translationResult = await translationService.translateMessageSafe(
              content,
              recipientLanguage,
              language
            );
            
            finalTranslatedContent = translationResult.translation;
            translationError = translationResult.error;
            
            console.log(`Message translated from ${language} to ${recipientLanguage}`, 
              translationError ? '(with error)' : '(success)');
          }
        }
        
        // Send message to database with both original and translated content
        const message = await sendMessageService({
          roomId,
          role,
          senderId: doctorId,
          content,
          cipherKey,
          language,
          targetLanguage: finalTargetLanguage,
          translatedContent: finalTranslatedContent,
          isAudio,
        });
        
        // Check if there are online recipients
        if (otherParticipants.length > 0) {
          // Emit new_message to other participants in the room
          socket.to(roomId).emit('new_message', {
            id: message.id,
            content: message.content,
            translatedContent: message.translatedContent,
            senderRole: message.senderRole,
            senderId: message.senderId,
            language: message.language,
            targetLanguage: message.targetLanguage,
            timestamp: message.timestamp,
            isAudio: message.isAudio,
            translationError,
          });
          
          // Emit message_translated event to confirm translation
          if (finalTranslatedContent && !translationError) {
            socket.to(roomId).emit('message_translated', {
              id: message.id,
              translatedContent: message.translatedContent,
              targetLanguage: message.targetLanguage,
            });
          }
        } else {
          // Queue message for offline delivery
          if (!offlineMessageQueues.has(roomId)) {
            offlineMessageQueues.set(roomId, []);
          }
          
          offlineMessageQueues.get(roomId)!.push({
            content: message.content,
            senderRole: message.senderRole,
            senderId: message.senderId,
            language: message.language,
            timestamp: message.timestamp,
          });
          
          console.log(`Message queued for offline delivery in room ${roomId}`);
        }
        
        // Confirm to sender
        socket.emit('message_sent', {
          id: message.id,
          timestamp: message.timestamp,
        });
        
        console.log(`Message sent in room ${roomId} by ${role}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to send message' 
        });
      }
    });
    
    // Handle leave_room event
    socket.on('leave_room', async () => {
      try {
        const session = getSession(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const { roomId, role, doctorId } = session;
        
        // Leave the Socket.io room
        socket.leave(roomId);
        
        // Notify other participants that keys are invalidated
        socket.to(roomId).emit('cipher_key_invalidated', {
          reason: 'participant_left',
        });
        
        // Notify other participants
        socket.to(roomId).emit('user_left', {
          role,
          doctorId,
        });
        
        // Update database if doctor is leaving
        if (role === 'doctor' && doctorId) {
          await leaveRoomService(roomId, role, doctorId);
        }
        
        // Clean up session
        deleteSession(socket.id);
        
        console.log(`${role} left room ${roomId}`, doctorId ? `(Doctor ID: ${doctorId})` : '');
      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to leave room' 
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      
      // Get session before deleting
      const session = getSession(socket.id);
      
      if (session) {
        // Leave the Socket.io room
        socket.leave(session.roomId);
        
        // Notify other participants that keys are invalidated
        socket.to(session.roomId).emit('cipher_key_invalidated', {
          reason: 'participant_disconnected',
        });
        
        // Notify other participants in the room
        socket.to(session.roomId).emit('user_left', {
          role: session.role,
          doctorId: session.doctorId,
        });
        
        // Update database if doctor is disconnecting
        if (session.role === 'doctor' && session.doctorId) {
          try {
            await leaveRoomService(session.roomId, session.role, session.doctorId);
          } catch (error) {
            console.error('Error updating room on disconnect:', error);
          }
        }
        
        // Clean up session
        deleteSession(session.socketId);
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', socket.id, error);
    });
  });
}

export { sessions, roomParticipants, offlineMessageQueues };
