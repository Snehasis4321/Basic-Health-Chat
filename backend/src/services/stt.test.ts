// Mock the OpenAI module
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    })),
  };
});

import { sttService } from './stt';

describe('STTService', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockCreate.mockClear();
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio buffer successfully', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const expectedTranscription = 'Hello, this is a test transcription';
      
      // Mock the OpenAI API response
      mockCreate.mockResolvedValue(expectedTranscription);
      
      const result = await sttService.transcribeAudio(audioBuffer);
      
      expect(result).toBe(expectedTranscription);
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: undefined,
        response_format: 'text',
      });
    });

    it('should transcribe audio with specified language', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const expectedTranscription = 'Hola, esta es una prueba';
      const language = 'es';
      
      mockCreate.mockResolvedValue(expectedTranscription);
      
      const result = await sttService.transcribeAudio(audioBuffer, language);
      
      expect(result).toBe(expectedTranscription);
      expect(mockCreate).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: 'es',
        response_format: 'text',
      });
    });

    it('should throw error for empty audio buffer', async () => {
      const emptyBuffer = Buffer.from('');
      
      await expect(sttService.transcribeAudio(emptyBuffer)).rejects.toThrow(
        'Audio buffer is empty'
      );
    });

    it('should throw error when OpenAI API returns empty transcription', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      
      mockCreate.mockResolvedValue('');
      
      await expect(sttService.transcribeAudio(audioBuffer)).rejects.toThrow(
        'OpenAI API returned empty transcription'
      );
    });

    it('should throw error when OpenAI API fails', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const apiError = new Error('API Error');
      
      mockCreate.mockRejectedValue(apiError);
      
      await expect(sttService.transcribeAudio(audioBuffer)).rejects.toThrow(
        'STT transcription failed: API Error'
      );
    });

    it('should trim whitespace from transcription', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const transcriptionWithWhitespace = '  Hello, world!  \n';
      
      mockCreate.mockResolvedValue(transcriptionWithWhitespace);
      
      const result = await sttService.transcribeAudio(audioBuffer);
      
      expect(result).toBe('Hello, world!');
    });
  });

  describe('transcribeAudioSafe', () => {
    it('should return transcription on success', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const expectedTranscription = 'Test transcription';
      
      mockCreate.mockResolvedValue(expectedTranscription);
      
      const result = await sttService.transcribeAudioSafe(audioBuffer);
      
      expect(result).toBe(expectedTranscription);
    });

    it('should return null on failure', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      
      mockCreate.mockRejectedValue(new Error('API Error'));
      
      const result = await sttService.transcribeAudioSafe(audioBuffer);
      
      expect(result).toBeNull();
    });

    it('should return null for empty buffer', async () => {
      const emptyBuffer = Buffer.from('');
      
      const result = await sttService.transcribeAudioSafe(emptyBuffer);
      
      expect(result).toBeNull();
    });
  });
});
