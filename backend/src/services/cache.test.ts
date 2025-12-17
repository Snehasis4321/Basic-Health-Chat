import { CacheService } from './cache.js';
import { redisClient } from '../config/redis.js';

// Mock the Redis client
jest.mock('../config/redis.js', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    jest.clearAllMocks();
  });

  describe('Translation caching', () => {
    it('should get cached translation', async () => {
      const content = 'Hello, world!';
      const targetLanguage = 'es';
      const translation = 'Hola, mundo!';

      (redisClient.get as jest.Mock).mockResolvedValue(translation);

      const result = await cacheService.getTranslation(content, targetLanguage);

      expect(result).toBe(translation);
      expect(redisClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/^trans:[a-f0-9]{64}:es$/)
      );
    });

    it('should return null when translation not in cache', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.getTranslation('test', 'fr');

      expect(result).toBeNull();
    });

    it('should set translation in cache with correct TTL', async () => {
      const content = 'Hello';
      const targetLanguage = 'de';
      const translation = 'Hallo';

      await cacheService.setTranslation(content, targetLanguage, translation);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^trans:[a-f0-9]{64}:de$/),
        7 * 24 * 60 * 60, // 7 days in seconds
        translation
      );
    });

    it('should handle errors when getting translation', async () => {
      (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getTranslation('test', 'es');

      expect(result).toBeNull();
    });

    it('should handle errors when setting translation', async () => {
      (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        cacheService.setTranslation('test', 'es', 'prueba')
      ).resolves.not.toThrow();
    });
  });

  describe('TTS caching', () => {
    it('should get cached TTS audio', async () => {
      const text = 'Hello';
      const language = 'en';
      const audioBuffer = Buffer.from('audio data');
      const base64Audio = audioBuffer.toString('base64');

      (redisClient.get as jest.Mock).mockResolvedValue(base64Audio);

      const result = await cacheService.getTTS(text, language);

      expect(result).toEqual(audioBuffer);
      expect(redisClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/^tts:[a-f0-9]{64}:en$/)
      );
    });

    it('should return null when TTS not in cache', async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.getTTS('test', 'en');

      expect(result).toBeNull();
    });

    it('should set TTS audio in cache with correct TTL', async () => {
      const text = 'Hello';
      const language = 'en';
      const audioBuffer = Buffer.from('audio data');
      const base64Audio = audioBuffer.toString('base64');

      await cacheService.setTTS(text, language, audioBuffer);

      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^tts:[a-f0-9]{64}:en$/),
        24 * 60 * 60, // 24 hours in seconds
        base64Audio
      );
    });

    it('should handle errors when getting TTS', async () => {
      (redisClient.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getTTS('test', 'en');

      expect(result).toBeNull();
    });

    it('should handle errors when setting TTS', async () => {
      (redisClient.setEx as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        cacheService.setTTS('test', 'en', Buffer.from('audio'))
      ).resolves.not.toThrow();
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache entries matching pattern', async () => {
      const keys = ['trans:abc123:es', 'trans:def456:es'];
      (redisClient.keys as jest.Mock).mockResolvedValue(keys);

      await cacheService.invalidateCache('trans:*');

      expect(redisClient.keys).toHaveBeenCalledWith('trans:*');
      expect(redisClient.del).toHaveBeenCalledWith(keys);
    });

    it('should handle no matching keys', async () => {
      (redisClient.keys as jest.Mock).mockResolvedValue([]);

      await cacheService.invalidateCache('trans:*');

      expect(redisClient.keys).toHaveBeenCalledWith('trans:*');
      expect(redisClient.del).not.toHaveBeenCalled();
    });

    it('should handle errors during invalidation', async () => {
      (redisClient.keys as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        cacheService.invalidateCache('trans:*')
      ).resolves.not.toThrow();
    });
  });

  describe('Cache key generation', () => {
    it('should generate consistent keys for same input', async () => {
      const content = 'test content';
      const language = 'es';

      await cacheService.setTranslation(content, language, 'contenido de prueba');
      const firstCall = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      jest.clearAllMocks();

      await cacheService.setTranslation(content, language, 'contenido de prueba');
      const secondCall = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      expect(firstCall).toBe(secondCall);
    });

    it('should generate different keys for different content', async () => {
      await cacheService.setTranslation('content1', 'es', 'translation1');
      const firstKey = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      jest.clearAllMocks();

      await cacheService.setTranslation('content2', 'es', 'translation2');
      const secondKey = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      expect(firstKey).not.toBe(secondKey);
    });

    it('should generate different keys for different languages', async () => {
      const content = 'same content';

      await cacheService.setTranslation(content, 'es', 'translation1');
      const firstKey = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      jest.clearAllMocks();

      await cacheService.setTranslation(content, 'fr', 'translation2');
      const secondKey = (redisClient.setEx as jest.Mock).mock.calls[0][0];

      expect(firstKey).not.toBe(secondKey);
    });
  });
});
