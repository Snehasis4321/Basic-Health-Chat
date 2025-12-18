import { TTSService } from './tts';
import { cacheService } from './cache';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('openai');
jest.mock('./cache');

describe('TTSService', () => {
  let ttsService: TTSService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    ttsService = new TTSService();
    mockOpenAI = new OpenAI({ apiKey: 'test-key' }) as jest.Mocked<OpenAI>;
    jest.clearAllMocks();
  });

  describe('generateSpeech', () => {
    it('should return cached audio if available', async () => {
      const text = 'Hello world';
      const language = 'en';
      const cachedBuffer = Buffer.from('cached-audio-data');

      (cacheService.getTTS as jest.Mock).mockResolvedValue(cachedBuffer);

      const result = await ttsService.generateSpeech(text, language);

      expect(result).toBe(cachedBuffer);
      expect(cacheService.getTTS).toHaveBeenCalledWith(text, language);
    });

    it('should call OpenAI API when cache misses', async () => {
      const text = 'Hello world';
      const language = 'en';
      const audioData = Buffer.from('audio-data');

      (cacheService.getTTS as jest.Mock).mockResolvedValue(null);
      
      // Mock OpenAI response
      const mockArrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength
      );
      
      const mockResponse = {
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      };

      (OpenAI.prototype.audio as any) = {
        speech: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      const result = await ttsService.generateSpeech(text, language);

      expect(result).toBeInstanceOf(Buffer);
      expect(cacheService.setTTS).toHaveBeenCalledWith(text, language, expect.any(Buffer));
    });

    it('should throw error when OpenAI API fails', async () => {
      const text = 'Hello world';
      const language = 'en';

      (cacheService.getTTS as jest.Mock).mockResolvedValue(null);
      
      (OpenAI.prototype.audio as any) = {
        speech: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      };

      await expect(ttsService.generateSpeech(text, language)).rejects.toThrow('TTS generation failed');
    });
  });

  describe('generateSpeechSafe', () => {
    it('should return null when generation fails', async () => {
      const text = 'Hello world';
      const language = 'en';

      (cacheService.getTTS as jest.Mock).mockResolvedValue(null);
      
      (OpenAI.prototype.audio as any) = {
        speech: {
          create: jest.fn().mockRejectedValue(new Error('API Error')),
        },
      };

      const result = await ttsService.generateSpeechSafe(text, language);

      expect(result).toBeNull();
    });
  });

  describe('streamAudio', () => {
    it('should stream audio in chunks', async () => {
      const audioBuffer = Buffer.from('a'.repeat(100000)); // 100KB
      const emitFunction = jest.fn();
      const chunkSize = 16 * 1024; // 16KB

      await ttsService.streamAudio(audioBuffer, emitFunction, chunkSize);

      const expectedChunks = Math.ceil(audioBuffer.length / chunkSize);
      expect(emitFunction).toHaveBeenCalledTimes(expectedChunks);
      
      // Verify first chunk
      expect(emitFunction).toHaveBeenNthCalledWith(1, 'audio_stream', {
        chunk: expect.any(String),
        index: 0,
        total: expectedChunks,
        isLast: false,
      });
      
      // Verify last chunk
      expect(emitFunction).toHaveBeenNthCalledWith(expectedChunks, 'audio_stream', {
        chunk: expect.any(String),
        index: expectedChunks - 1,
        total: expectedChunks,
        isLast: true,
      });
    });
  });

  describe('getVoiceForLanguage', () => {
    it('should map languages to appropriate voices', () => {
      // Access private method through any cast for testing
      const getVoice = (ttsService as any).getVoiceForLanguage.bind(ttsService);
      
      expect(getVoice('en')).toBe('alloy');
      expect(getVoice('es')).toBe('nova');
      expect(getVoice('fr')).toBe('shimmer');
      expect(getVoice('de')).toBe('onyx');
      expect(getVoice('unknown')).toBe('alloy'); // default
    });
  });
});
