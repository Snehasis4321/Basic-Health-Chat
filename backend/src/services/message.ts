import pool from '../config/database.js';
import { encryptMessage, decryptMessage } from './encryption.js';

export interface Message {
  id: string;
  roomId: string;
  senderRole: 'patient' | 'doctor';
  senderId: string | null;
  content: string;
  translatedContent: string | null;
  language: string;
  targetLanguage: string | null;
  timestamp: Date;
  isAudio: boolean;
}

export interface SendMessageParams {
  roomId: string;
  role: 'patient' | 'doctor';
  senderId: string | null; // null for patients, doctor UUID for doctors
  content: string;
  cipherKey: string;
  language?: string;
  targetLanguage?: string;
  translatedContent?: string;
  isAudio?: boolean;
}

export interface GetMessagesParams {
  roomId: string;
  cipherKey: string;
  limit?: number;
  offset?: number;
}

/**
 * Send a message with encryption
 * @param params - Message parameters
 * @returns Created message object with decrypted content
 */
export async function sendMessage(params: SendMessageParams): Promise<Message> {
  const {
    roomId,
    role,
    senderId,
    content,
    cipherKey,
    language = 'en',
    targetLanguage = null,
    translatedContent = null,
    isAudio = false,
  } = params;

  // Validate role and senderId consistency
  if (role === 'patient' && senderId !== null) {
    throw new Error('Patient messages must have null senderId for anonymity');
  }

  if (role === 'doctor' && !senderId) {
    throw new Error('Doctor messages must have a valid senderId');
  }

  // Encrypt the message content
  const encryptedContent = encryptMessage(content, cipherKey);

  // Encrypt translated content if provided
  const encryptedTranslatedContent = translatedContent
    ? encryptMessage(translatedContent, cipherKey)
    : null;

  // Insert message into database
  const result = await pool.query(
    `INSERT INTO messages (
      room_id, 
      sender_role, 
      sender_id, 
      content, 
      translated_content, 
      language, 
      target_language, 
      is_audio
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING 
      id, 
      room_id as "roomId", 
      sender_role as "senderRole", 
      sender_id as "senderId", 
      content, 
      translated_content as "translatedContent", 
      language, 
      target_language as "targetLanguage", 
      timestamp, 
      is_audio as "isAudio"`,
    [
      roomId,
      role,
      senderId,
      encryptedContent,
      encryptedTranslatedContent,
      language,
      targetLanguage,
      isAudio,
    ]
  );

  const message = result.rows[0];

  // Return message with decrypted content
  return {
    ...message,
    content: decryptMessage(message.content, cipherKey),
    translatedContent: message.translatedContent
      ? decryptMessage(message.translatedContent, cipherKey)
      : null,
  };
}

/**
 * Get messages with decryption and pagination
 * @param params - Query parameters
 * @returns Array of messages with decrypted content
 */
export async function getMessages(params: GetMessagesParams): Promise<Message[]> {
  const {
    roomId,
    cipherKey,
    limit = 50,
    offset = 0,
  } = params;

  // Query messages from database with pagination
  const result = await pool.query(
    `SELECT 
      id, 
      room_id as "roomId", 
      sender_role as "senderRole", 
      sender_id as "senderId", 
      content, 
      translated_content as "translatedContent", 
      language, 
      target_language as "targetLanguage", 
      timestamp, 
      is_audio as "isAudio"
    FROM messages 
    WHERE room_id = $1 
    ORDER BY timestamp DESC 
    LIMIT $2 OFFSET $3`,
    [roomId, limit, offset]
  );

  // Decrypt all messages
  const messages = result.rows.map((message) => ({
    ...message,
    content: decryptMessage(message.content, cipherKey),
    translatedContent: message.translatedContent
      ? decryptMessage(message.translatedContent, cipherKey)
      : null,
  }));

  return messages;
}
