import OpenAI from 'openai';
import { Readable } from 'stream';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * STTService handles speech-to-text conversion using OpenAI Whisper API
 */
export class STTService {
  /**
   * Transcribe audio to text using OpenAI Whisper
   * 
   * @param audioBuffer - Audio buffer to transcribe
   * @param language - Optional language code (e.g., 'en', 'es', 'fr')
   * @returns Transcribed text
   */
  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<string> {
    try {
      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty');
      }
      
      console.log(`Transcribing audio (${audioBuffer.length} bytes)${language ? ` in language: ${language}` : ''}`);
      
      // Convert buffer to a File-like object that OpenAI expects
      // Create a readable stream from the buffer
      const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
      
      // Call OpenAI Whisper API
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language, // Optional: helps with accuracy
        response_format: 'text',
      });
      
      // Response is directly the text when response_format is 'text'
      const transcription = typeof response === 'string' ? response : String(response);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('OpenAI API returned empty transcription');
      }
      
      console.log(`Transcription successful: "${transcription.substring(0, 50)}..."`);
      
      return transcription.trim();
    } catch (error) {
      console.error('STT transcription error:', error);
      throw new Error(`STT transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Transcribe audio with graceful error handling
   * Returns null if transcription fails
   * 
   * @param audioBuffer - Audio buffer to transcribe
   * @param language - Optional language code
   * @returns Transcribed text or null if failed
   */
  async transcribeAudioSafe(audioBuffer: Buffer, language?: string): Promise<string | null> {
    try {
      return await this.transcribeAudio(audioBuffer, language);
    } catch (error) {
      console.error('STT transcription failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const sttService = new STTService();
