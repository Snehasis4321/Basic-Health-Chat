import OpenAI from 'openai';
import { cacheService } from './cache.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * TTSService handles text-to-speech conversion using OpenAI API with caching
 */
export class TTSService {
  /**
   * Generate speech audio from text
   * Checks cache first, then calls OpenAI API if not cached
   * 
   * @param text - Text to convert to speech
   * @param language - Language code (e.g., 'en', 'es', 'fr')
   * @returns Audio buffer
   */
  async generateSpeech(text: string, language: string = 'en'): Promise<Buffer> {
    try {
      // Check cache first
      const cachedAudio = await cacheService.getTTS(text, language);
      
      if (cachedAudio) {
        console.log(`TTS cache hit for language: ${language}`);
        return cachedAudio;
      }
      
      console.log(`TTS cache miss, calling OpenAI API for language: ${language}`);
      
      // Map language codes to OpenAI voice options
      // OpenAI supports: alloy, echo, fable, onyx, nova, shimmer
      const voice = this.getVoiceForLanguage(language);
      
      // Call OpenAI TTS API
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        response_format: 'mp3',
      });
      
      // Convert response to buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('OpenAI API returned empty audio buffer');
      }
      
      // Cache the audio
      await cacheService.setTTS(text, language, audioBuffer);
      
      return audioBuffer;
    } catch (error) {
      console.error('TTS generation error:', error);
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate speech with graceful error handling
   * Returns null if generation fails
   * 
   * @param text - Text to convert to speech
   * @param language - Language code
   * @returns Audio buffer or null if failed
   */
  async generateSpeechSafe(text: string, language: string = 'en'): Promise<Buffer | null> {
    try {
      return await this.generateSpeech(text, language);
    } catch (error) {
      console.error('TTS generation failed:', error);
      return null;
    }
  }
  
  /**
   * Map language code to OpenAI voice
   * OpenAI voices are multilingual and work with all languages
   * @param language - Language code
   * @returns OpenAI voice name
   */
  private getVoiceForLanguage(language: string): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
    // Map languages to voices with variety
    // All OpenAI voices are multilingual and support all languages
    const voiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
      'en': 'alloy',      // English - neutral
      'es': 'nova',       // Spanish - warm
      'fr': 'shimmer',    // French - soft
      'de': 'onyx',       // German - deep
      'it': 'echo',       // Italian - clear
      'pt': 'fable',      // Portuguese - expressive
      'zh': 'alloy',      // Chinese - neutral
      'ja': 'shimmer',    // Japanese - soft
      'ko': 'nova',       // Korean - warm
      'ru': 'onyx',       // Russian - deep
      'ar': 'fable',      // Arabic - expressive
      'hi': 'echo',       // Hindi - clear
    };
    
    return voiceMap[language] || 'alloy';
  }
  
  /**
   * Stream audio to a WebSocket client in chunks
   * @param audioBuffer - Audio buffer to stream
   * @param emitFunction - Function to emit audio chunks (e.g., socket.emit)
   * @param chunkSize - Size of each chunk in bytes (default: 16KB)
   */
  async streamAudio(
    audioBuffer: Buffer,
    emitFunction: (event: string, data: any) => void,
    chunkSize: number = 16 * 1024
  ): Promise<void> {
    try {
      const totalChunks = Math.ceil(audioBuffer.length / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);
        
        // Emit audio chunk
        emitFunction('audio_stream', {
          chunk: chunk.toString('base64'),
          index: i,
          total: totalChunks,
          isLast: i === totalChunks - 1,
        });
        
        // Small delay to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`Streamed ${totalChunks} audio chunks`);
    } catch (error) {
      console.error('Error streaming audio:', error);
      throw new Error(`Audio streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const ttsService = new TTSService();
