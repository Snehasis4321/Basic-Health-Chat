import { 
  createSession, 
  deleteSession, 
  getSession, 
  getRoomSessions,
  areBothParticipantsPresent,
  Session 
} from './websocket.js';

describe('WebSocket Service', () => {
  beforeEach(() => {
    // Clear sessions before each test
    // Note: In a real implementation, we'd want to expose a clearSessions function
  });

  describe('Session Management', () => {
    it('should create and retrieve a session', () => {
      const session: Session = {
        socketId: 'socket-123',
        roomId: 'room-456',
        role: 'patient',
        doctorId: null,
        language: 'en',
        connectedAt: new Date(),
      };

      createSession(session);
      const retrieved = getSession('socket-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.socketId).toBe('socket-123');
      expect(retrieved?.roomId).toBe('room-456');
      expect(retrieved?.role).toBe('patient');
      expect(retrieved?.doctorId).toBeNull();
    });

    it('should delete a session', () => {
      const session: Session = {
        socketId: 'socket-789',
        roomId: 'room-101',
        role: 'doctor',
        doctorId: 'doctor-001',
        language: 'es',
        connectedAt: new Date(),
      };

      createSession(session);
      expect(getSession('socket-789')).toBeDefined();

      deleteSession('socket-789');
      expect(getSession('socket-789')).toBeUndefined();
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = getSession('non-existent-socket');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Room Participants', () => {
    it('should track multiple participants in a room', () => {
      const patientSession: Session = {
        socketId: 'patient-socket',
        roomId: 'room-shared',
        role: 'patient',
        doctorId: null,
        language: 'en',
        connectedAt: new Date(),
      };

      const doctorSession: Session = {
        socketId: 'doctor-socket',
        roomId: 'room-shared',
        role: 'doctor',
        doctorId: 'doctor-123',
        language: 'en',
        connectedAt: new Date(),
      };

      createSession(patientSession);
      createSession(doctorSession);

      const roomSessions = getRoomSessions('room-shared');
      expect(roomSessions).toHaveLength(2);
      expect(roomSessions.some(s => s.role === 'patient')).toBe(true);
      expect(roomSessions.some(s => s.role === 'doctor')).toBe(true);
    });

    it('should detect when both participants are present', () => {
      const patientSession: Session = {
        socketId: 'patient-socket-2',
        roomId: 'room-both',
        role: 'patient',
        doctorId: null,
        language: 'en',
        connectedAt: new Date(),
      };

      const doctorSession: Session = {
        socketId: 'doctor-socket-2',
        roomId: 'room-both',
        role: 'doctor',
        doctorId: 'doctor-456',
        language: 'en',
        connectedAt: new Date(),
      };

      createSession(patientSession);
      expect(areBothParticipantsPresent('room-both')).toBe(false);

      createSession(doctorSession);
      expect(areBothParticipantsPresent('room-both')).toBe(true);
    });

    it('should return false when only patient is present', () => {
      const patientSession: Session = {
        socketId: 'patient-only',
        roomId: 'room-patient-only',
        role: 'patient',
        doctorId: null,
        language: 'en',
        connectedAt: new Date(),
      };

      createSession(patientSession);
      expect(areBothParticipantsPresent('room-patient-only')).toBe(false);
    });

    it('should return false when only doctor is present', () => {
      const doctorSession: Session = {
        socketId: 'doctor-only',
        roomId: 'room-doctor-only',
        role: 'doctor',
        doctorId: 'doctor-789',
        language: 'en',
        connectedAt: new Date(),
      };

      createSession(doctorSession);
      expect(areBothParticipantsPresent('room-doctor-only')).toBe(false);
    });

    it('should return empty array for room with no participants', () => {
      const roomSessions = getRoomSessions('empty-room');
      expect(roomSessions).toHaveLength(0);
    });
  });
});
