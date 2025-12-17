import crypto from 'crypto';
import pool from '../config/database.js';

export interface Room {
  id: string;
  doctorId: string | null;
  cipherKey: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a cipher key for room encryption
 * @returns Base64 encoded cipher key
 */
export function generateCipherKey(): string {
  // Generate a 256-bit (32 byte) random key for AES-256
  const key = crypto.randomBytes(32);
  return key.toString('base64');
}

/**
 * Create a new anonymous room for a patient
 * @returns Created room object
 */
export async function createRoom(): Promise<Room> {
  // Generate cipher key for the room
  const cipherKey = generateCipherKey();
  
  // Insert room into database
  const result = await pool.query(
    `INSERT INTO rooms (cipher_key) 
     VALUES ($1) 
     RETURNING id, doctor_id as "doctorId", cipher_key as "cipherKey", created_at as "createdAt", updated_at as "updatedAt"`,
    [cipherKey]
  );
  
  return result.rows[0];
}

/**
 * Get room details by room ID
 * @param roomId - UUID of the room
 * @returns Room object or null if not found
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  const result = await pool.query(
    `SELECT id, doctor_id as "doctorId", cipher_key as "cipherKey", created_at as "createdAt", updated_at as "updatedAt" 
     FROM rooms 
     WHERE id = $1`,
    [roomId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

/**
 * Join a room as a doctor (requires authentication)
 * @param roomId - UUID of the room to join
 * @param doctorId - UUID of the authenticated doctor
 * @throws Error if room not found or doctor already assigned
 */
export async function joinRoomAsDoctor(roomId: string, doctorId: string): Promise<void> {
  // Check if room exists
  const room = await getRoom(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Check if a doctor is already assigned to this room
  if (room.doctorId && room.doctorId !== doctorId) {
    throw new Error('Room already has a doctor assigned');
  }
  
  // Update room with doctor ID
  await pool.query(
    `UPDATE rooms 
     SET doctor_id = $1, updated_at = NOW() 
     WHERE id = $2`,
    [doctorId, roomId]
  );
}

/**
 * Leave a room and perform cleanup
 * @param roomId - UUID of the room
 * @param role - Role of the participant leaving ('patient' or 'doctor')
 * @param doctorId - UUID of the doctor (required if role is 'doctor')
 */
export async function leaveRoom(
  roomId: string, 
  role: 'patient' | 'doctor',
  doctorId?: string
): Promise<void> {
  // Check if room exists
  const room = await getRoom(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  if (role === 'doctor' && doctorId) {
    // Verify the doctor is actually in this room
    if (room.doctorId !== doctorId) {
      throw new Error('Doctor not in this room');
    }
    
    // Remove doctor from room
    await pool.query(
      `UPDATE rooms 
       SET doctor_id = NULL, updated_at = NOW() 
       WHERE id = $1`,
      [roomId]
    );
  }
  
  // For patient leaving, we could implement additional cleanup logic here
  // such as marking the room as inactive or setting a flag
  // For now, we just acknowledge the leave without database changes
}

/**
 * Exchange cipher keys for a room
 * This function is called when both participants are in the room
 * @param roomId - UUID of the room
 * @returns The cipher key for the room
 */
export async function exchangeKeys(roomId: string): Promise<string> {
  const room = await getRoom(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  return room.cipherKey;
}
