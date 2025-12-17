import { createRoom, getRoom, joinRoomAsDoctor, leaveRoom, generateCipherKey } from './room.js';
import pool from '../config/database.js';
import { registerDoctor } from './auth.js';

describe('RoomService', () => {
  let testDoctorId: string;

  beforeAll(async () => {
    // Create a test doctor for join tests
    const doctor = await registerDoctor('room-test-doctor@example.com', 'password123');
    testDoctorId = doctor.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM rooms WHERE id IN (SELECT id FROM rooms WHERE created_at > NOW() - INTERVAL \'1 hour\')');
    await pool.query('DELETE FROM doctors WHERE email = $1', ['room-test-doctor@example.com']);
    await pool.end();
  });

  describe('generateCipherKey', () => {
    it('should generate a base64 encoded cipher key', () => {
      const key = generateCipherKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      
      // Verify it's valid base64
      const buffer = Buffer.from(key, 'base64');
      expect(buffer.length).toBe(32); // 256 bits = 32 bytes
    });

    it('should generate unique keys', () => {
      const key1 = generateCipherKey();
      const key2 = generateCipherKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('createRoom', () => {
    it('should create a new room with cipher key', async () => {
      const room = await createRoom();
      
      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
      expect(room.cipherKey).toBeDefined();
      expect(room.doctorId).toBeNull();
      expect(room.createdAt).toBeDefined();
      expect(room.updatedAt).toBeDefined();
    });

    it('should create rooms with unique IDs', async () => {
      const room1 = await createRoom();
      const room2 = await createRoom();
      
      expect(room1.id).not.toBe(room2.id);
    });
  });

  describe('getRoom', () => {
    it('should retrieve an existing room', async () => {
      const createdRoom = await createRoom();
      const retrievedRoom = await getRoom(createdRoom.id);
      
      expect(retrievedRoom).toBeDefined();
      expect(retrievedRoom?.id).toBe(createdRoom.id);
      expect(retrievedRoom?.cipherKey).toBe(createdRoom.cipherKey);
    });

    it('should return null for non-existent room', async () => {
      const room = await getRoom('00000000-0000-0000-0000-000000000000');
      expect(room).toBeNull();
    });
  });

  describe('joinRoomAsDoctor', () => {
    it('should allow doctor to join a room', async () => {
      const room = await createRoom();
      
      await joinRoomAsDoctor(room.id, testDoctorId);
      
      const updatedRoom = await getRoom(room.id);
      expect(updatedRoom?.doctorId).toBe(testDoctorId);
    });

    it('should throw error when room not found', async () => {
      await expect(
        joinRoomAsDoctor('00000000-0000-0000-0000-000000000000', testDoctorId)
      ).rejects.toThrow('Room not found');
    });

    it('should throw error when room already has a different doctor', async () => {
      const room = await createRoom();
      const doctor2 = await registerDoctor('room-test-doctor2@example.com', 'password123');
      
      await joinRoomAsDoctor(room.id, testDoctorId);
      
      await expect(
        joinRoomAsDoctor(room.id, doctor2.id)
      ).rejects.toThrow('Room already has a doctor assigned');
      
      // Cleanup
      await pool.query('DELETE FROM doctors WHERE id = $1', [doctor2.id]);
    });
  });

  describe('leaveRoom', () => {
    it('should allow doctor to leave a room', async () => {
      const room = await createRoom();
      await joinRoomAsDoctor(room.id, testDoctorId);
      
      await leaveRoom(room.id, 'doctor', testDoctorId);
      
      const updatedRoom = await getRoom(room.id);
      expect(updatedRoom?.doctorId).toBeNull();
    });

    it('should throw error when room not found', async () => {
      await expect(
        leaveRoom('00000000-0000-0000-0000-000000000000', 'patient')
      ).rejects.toThrow('Room not found');
    });

    it('should allow patient to leave without error', async () => {
      const room = await createRoom();
      
      await expect(
        leaveRoom(room.id, 'patient')
      ).resolves.not.toThrow();
    });
  });
});
