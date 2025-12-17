import { sendMessage, getMessages, SendMessageParams } from './message';
import { generateCipherKey } from './encryption';
import pool from '../config/database';

describe('MessageService', () => {
  let testRoomId: string;
  let testDoctorId: string;
  let cipherKey: string;

  beforeAll(async () => {
    // Create a test doctor
    const doctorResult = await pool.query(
      `INSERT INTO doctors (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id`,
      ['test-message-doctor@example.com', 'hashedpassword']
    );
    testDoctorId = doctorResult.rows[0].id;

    // Create a test room
    cipherKey = generateCipherKey();
    const roomResult = await pool.query(
      `INSERT INTO rooms (doctor_id, cipher_key) 
       VALUES ($1, $2) 
       RETURNING id`,
      [testDoctorId, cipherKey]
    );
    testRoomId = roomResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM messages WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM rooms WHERE id = $1', [testRoomId]);
    await pool.query('DELETE FROM doctors WHERE id = $1', [testDoctorId]);
    await pool.end();
  });

  describe('sendMessage', () => {
    it('should send a patient message with null senderId', async () => {
      const params: SendMessageParams = {
        roomId: testRoomId,
        role: 'patient',
        senderId: null,
        content: 'Hello doctor, I need help',
        cipherKey,
        language: 'en',
      };

      const message = await sendMessage(params);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.roomId).toBe(testRoomId);
      expect(message.senderRole).toBe('patient');
      expect(message.senderId).toBeNull();
      expect(message.content).toBe('Hello doctor, I need help');
      expect(message.language).toBe('en');
      expect(message.isAudio).toBe(false);
    });

    it('should send a doctor message with senderId', async () => {
      const params: SendMessageParams = {
        roomId: testRoomId,
        role: 'doctor',
        senderId: testDoctorId,
        content: 'Hello patient, how can I help you?',
        cipherKey,
        language: 'en',
      };

      const message = await sendMessage(params);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.roomId).toBe(testRoomId);
      expect(message.senderRole).toBe('doctor');
      expect(message.senderId).toBe(testDoctorId);
      expect(message.content).toBe('Hello patient, how can I help you?');
      expect(message.language).toBe('en');
    });

    it('should reject patient message with non-null senderId', async () => {
      const params: SendMessageParams = {
        roomId: testRoomId,
        role: 'patient',
        senderId: testDoctorId, // Invalid: patient should have null senderId
        content: 'This should fail',
        cipherKey,
      };

      await expect(sendMessage(params)).rejects.toThrow(
        'Patient messages must have null senderId for anonymity'
      );
    });

    it('should reject doctor message with null senderId', async () => {
      const params: SendMessageParams = {
        roomId: testRoomId,
        role: 'doctor',
        senderId: null, // Invalid: doctor should have senderId
        content: 'This should fail',
        cipherKey,
      };

      await expect(sendMessage(params)).rejects.toThrow(
        'Doctor messages must have a valid senderId'
      );
    });

    it('should store encrypted content in database', async () => {
      const params: SendMessageParams = {
        roomId: testRoomId,
        role: 'patient',
        senderId: null,
        content: 'Secret message',
        cipherKey,
      };

      const message = await sendMessage(params);

      // Query database directly to verify encryption
      const result = await pool.query(
        'SELECT content FROM messages WHERE id = $1',
        [message.id]
      );

      const storedContent = result.rows[0].content;

      // Stored content should be encrypted (not equal to original)
      expect(storedContent).not.toBe('Secret message');
      // Stored content should contain IV and encrypted data separated by colon
      expect(storedContent).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      // Clean up messages before each test
      await pool.query('DELETE FROM messages WHERE room_id = $1', [testRoomId]);
    });

    it('should retrieve and decrypt messages', async () => {
      // Send some messages
      await sendMessage({
        roomId: testRoomId,
        role: 'patient',
        senderId: null,
        content: 'First message',
        cipherKey,
      });

      await sendMessage({
        roomId: testRoomId,
        role: 'doctor',
        senderId: testDoctorId,
        content: 'Second message',
        cipherKey,
      });

      // Retrieve messages
      const messages = await getMessages({
        roomId: testRoomId,
        cipherKey,
      });

      expect(messages).toHaveLength(2);
      // Messages should be in reverse chronological order (newest first)
      expect(messages[0].content).toBe('Second message');
      expect(messages[0].senderRole).toBe('doctor');
      expect(messages[1].content).toBe('First message');
      expect(messages[1].senderRole).toBe('patient');
    });

    it('should support pagination with limit and offset', async () => {
      // Send multiple messages
      for (let i = 1; i <= 5; i++) {
        await sendMessage({
          roomId: testRoomId,
          role: 'patient',
          senderId: null,
          content: `Message ${i}`,
          cipherKey,
        });
      }

      // Get first page (2 messages)
      const page1 = await getMessages({
        roomId: testRoomId,
        cipherKey,
        limit: 2,
        offset: 0,
      });

      expect(page1).toHaveLength(2);
      expect(page1[0].content).toBe('Message 5'); // Newest first
      expect(page1[1].content).toBe('Message 4');

      // Get second page (2 messages)
      const page2 = await getMessages({
        roomId: testRoomId,
        cipherKey,
        limit: 2,
        offset: 2,
      });

      expect(page2).toHaveLength(2);
      expect(page2[0].content).toBe('Message 3');
      expect(page2[1].content).toBe('Message 2');
    });

    it('should return empty array for room with no messages', async () => {
      const messages = await getMessages({
        roomId: testRoomId,
        cipherKey,
      });

      expect(messages).toEqual([]);
    });
  });
});
