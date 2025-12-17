import { createHash } from 'crypto';
import { redisClient } from '../config/redis.js';

// TTL constants (in seconds)
const TRANSLATION_TTL = 7 * 24 * 60 * 60; // 7 days
const TTS_TTL = 24 * 60 * 60; // 24 hours

/**
 * CacheService handles caching of translations and TTS audio using Redis
 */
export class CacheService {
  /**
   * Generate a SHA-256 hash for cache key generation
   */
  private generateHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Generate cache key for translations
   */
  private getTranslationKey(content: string, targetLanguage: string): string {
    const hash = this.generateHash(content);
    return `trans:${hash}:${targetLanguage}`;
  }

  /**
   * Generate cache key for TTS audio
   */
  private getTTSKey(text: string, language: string): string {
    const hash = this.generateHash(text);
    return `tts:${hash}:${language}`;
  }

  /**
   * Get cached translation
   * @param content - Original content to translate
   * @param targetLanguage - Target language code
   * @returns Cached translation or null if not found
   */
  async getTranslation(content: string, targetLanguage: string): Promise<string | null> {
    try {
      const key = this.getTranslationKey(content, targetLanguage);
      const cached = await redisClient.get(key);
      return cached;
    } catch (error) {
      console.error('Error getting translation from cache:', error);
      return null;
    }
  }

  /**
   * Set translation in cache
   * @param content - Original content
   * @param targetLanguage - Target language code
   * @param translation - Translated content
   */
  async setTranslation(content: string, targetLanguage: string, translation: string): Promise<void> {
    try {
      const key = this.getTranslationKey(content, targetLanguage);
      await redisClient.setEx(key, TRANSLATION_TTL, translation);
    } catch (error) {
      console.error('Error setting translation in cache:', error);
      // Don't throw - caching failures should not break the application
    }
  }

  /**
   * Get cached TTS audio
   * @param text - Text to convert to speech
   * @param language - Language code
   * @returns Cached audio buffer or null if not found
   */
  async getTTS(text: string, language: string): Promise<Buffer | null> {
    try {
      const key = this.getTTSKey(text, language);
      const cached = await redisClient.get(key);
      
      if (cached) {
        // Redis stores binary data as base64 string
        return Buffer.from(cached, 'base64');
      }
      
      return null;
    } catch (error) {
      console.error('Error getting TTS from cache:', error);
      return null;
    }
  }

  /**
   * Set TTS audio in cache
   * @param text - Text that was converted to speech
   * @param language - Language code
   * @param audioBuffer - Audio buffer to cache
   */
  async setTTS(text: string, language: string, audioBuffer: Buffer): Promise<void> {
    try {
      const key = this.getTTSKey(text, language);
      // Store buffer as base64 string
      const base64Audio = audioBuffer.toString('base64');
      await redisClient.setEx(key, TTS_TTL, base64Audio);
    } catch (error) {
      console.error('Error setting TTS in cache:', error);
      // Don't throw - caching failures should not break the application
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Redis key pattern (e.g., 'trans:*', 'tts:*')
   */
  async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
