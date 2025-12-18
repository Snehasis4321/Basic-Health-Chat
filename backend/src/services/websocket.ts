import { Server, Socket } from 'socket.io';
import { validateToken, JWTPayload } from './auth.js';
import { exchangeKeys, leaveRoom as leaveRoomService } from './room.js';
import { sendMessage as sendMessageService, getMessages } from './message.js';
import { translationService } from './translation.js';
import { ttsService } from './tts.js';
import { sttService } from './stt.js';

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
        
        // Get existing participants in the room (before adding current user)
        const existingParticipants = getRoomSessions(roomId).filter(s => s.socketId !== socket.id);
        const hasPatient = existingParticipants.some(s => s.role === 'patient');
        const hasDoctor = existingParticipants.some(s => s.role === 'doctor');
        
        // Emit room_joined to the joining user with existing participants info
        socket.emit('room_joined', {
          roomId,
          role,
          doctorId,
          participants: {
            patient: hasPatient || role === 'patient',
            doctor: hasDoctor || role === 'doctor',
          },
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
    
    // Handle request_tts event
    socket.on('request_tts', async (data: {
      text: string;
      language?: string;
      messageId?: string;
    }) => {
      try {
        const session = getSession(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const { text, language, messageId } = data;
        
        // Validate text
        if (!text || text.trim().length === 0) {
          socket.emit('error', { message: 'Text is required for TTS' });
          return;
        }
        
        // Use session language if not provided
        const targetLanguage = language || session.language || 'en';
        
        console.log(`TTS requested for ${session.role} in room ${session.roomId}, language: ${targetLanguage}`);
        
        // Generate speech audio
        const audioBuffer = await ttsService.generateSpeechSafe(text, targetLanguage);
        
        if (!audioBuffer) {
          // TTS generation failed
          socket.emit('tts_error', {
            messageId,
            message: 'TTS generation failed, please read the text',
          });
          return;
        }
        
        // DEBUG: Save audio to file for verification
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug-audio');
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const debugFilename = `tts-${messageId || Date.now()}-${targetLanguage}.mp3`;
        const debugPath = path.join(debugDir, debugFilename);
        fs.writeFileSync(debugPath, audioBuffer);
        console.log(`[TTS] DEBUG: Saved audio to ${debugPath} (${audioBuffer.length} bytes)`);
        
        // Stream audio to the requesting client
        console.log(`[TTS] Starting to stream audio for message ${messageId}, buffer size: ${audioBuffer.length} bytes`);
        await ttsService.streamAudio(audioBuffer, (event, data) => {
          console.log(`[TTS] Emitting ${event} event with messageId: ${messageId}, chunk ${data.index + 1}/${data.total}`);
          socket.emit(event, {
            ...data,
            messageId,
          });
        });
        
        console.log(`[TTS] Audio streaming complete for ${session.role} in room ${session.roomId}`);
      } catch (error) {
        console.error('Error handling TTS request:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to generate TTS' 
        });
      }
    });
    
    // Handle audio_chunk event for streaming audio input
    socket.on('audio_chunk', async (data: {
      chunk: string; // Base64 encoded audio chunk
      isLast: boolean;
      language?: string;
    }) => {
      try {
        const session = getSession(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const { chunk, isLast, language } = data;
        
        // Validate chunk
        if (!chunk) {
          socket.emit('error', { message: 'Audio chunk is required' });
          return;
        }
        
        // Initialize audio buffer storage for this socket if not exists
        if (!socket.data.audioBuffer) {
          socket.data.audioBuffer = [];
        }
        
        // Decode and append chunk to buffer
        const chunkBuffer = Buffer.from(chunk, 'base64');
        socket.data.audioBuffer.push(chunkBuffer);
        
        console.log(`Received audio chunk from ${session.role} in room ${session.roomId} (${chunkBuffer.length} bytes)`);
        
        // If this is the last chunk, process the complete audio
        if (isLast) {
          console.log(`Processing complete audio from ${session.role} in room ${session.roomId}`);
          
          // Combine all chunks into a single buffer
          const completeAudioBuffer = Buffer.concat(socket.data.audioBuffer);
          
          // Clear the buffer
          socket.data.audioBuffer = [];
          
          // Use session language if not provided
          const targetLanguage = language || session.language || 'en';
          
          // Transcribe audio to text
          const transcribedText = await sttService.transcribeAudioSafe(
            completeAudioBuffer,
            targetLanguage
          );
          
          if (!transcribedText) {
            // STT failed
            socket.emit('stt_error', {
              message: 'Audio transcription failed, please try again or use text input',
            });
            return;
          }
          
          console.log(`Audio transcribed successfully: "${transcribedText.substring(0, 50)}..."`);
          
          // Emit transcription result to the sender
          socket.emit('audio_transcribed', {
            text: transcribedText,
            language: targetLanguage,
          });
          
          // Process the transcribed text as a normal text message
          // This will go through the normal message flow with encryption, translation, etc.
          const { roomId, role, doctorId } = session;
          
          // Get cipher key from room
          const cipherKey = await exchangeKeys(roomId);
          
          // Get other participants in the room to determine target language
          const roomSessions = getRoomSessions(roomId);
          const otherParticipants = roomSessions.filter(s => s.socketId !== socket.id);
          
          // Translate message for each recipient's language
          let translatedContent: string | undefined;
          let finalTargetLanguage: string | undefined;
          let translationError = false;
          
          // If there are recipients, translate to their language
          if (otherParticipants.length > 0) {
            const recipientLanguage = otherParticipants[0].language;
            
            if (recipientLanguage && recipientLanguage !== targetLanguage) {
              finalTargetLanguage = recipientLanguage;
              
              // Translate the message
              const translationResult = await translationService.translateMessageSafe(
                transcribedText,
                recipientLanguage,
                targetLanguage
              );
              
              translatedContent = translationResult.translation;
              translationError = translationResult.error;
              
              console.log(`Audio message translated from ${targetLanguage} to ${recipientLanguage}`, 
                translationError ? '(with error)' : '(success)');
            }
          }
          
          // Send message to database with both original and translated content
          const message = await sendMessageService({
            roomId,
            role,
            senderId: doctorId,
            content: transcribedText,
            cipherKey,
            language: targetLanguage,
            targetLanguage: finalTargetLanguage,
            translatedContent,
            isAudio: true, // Mark as audio-originated message
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
            if (translatedContent && !translationError) {
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
            
            console.log(`Audio message queued for offline delivery in room ${roomId}`);
          }
          
          // Confirm to sender
          socket.emit('message_sent', {
            id: message.id,
            timestamp: message.timestamp,
          });
          
          console.log(`Audio message sent in room ${roomId} by ${role}`);
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        
        // Clear the audio buffer on error
        if (socket.data.audioBuffer) {
          socket.data.audioBuffer = [];
        }
        
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to process audio' 
        });
      }
    });
    
    // Handle update_language event
    socket.on('update_language', (data: { language: string }) => {
      try {
        const session = getSession(socket.id);
        
        if (!session) {
          socket.emit('error', { message: 'No active session found' });
          return;
        }
        
        const { language } = data;
        
        // Validate language
        if (!language || typeof language !== 'string') {
          socket.emit('error', { message: 'Invalid language' });
          return;
        }
        
        // Update session language
        session.language = language;
        sessions.set(socket.id, session);
        
        console.log(`${session.role} updated language to ${language} in room ${session.roomId}`);
        
        // Confirm language update
        socket.emit('language_updated', {
          language,
        });
      } catch (error) {
        console.error('Error updating language:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to update language' 
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
