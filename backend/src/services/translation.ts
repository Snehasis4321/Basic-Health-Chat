import OpenAI from 'openai';
import { cacheService } from './cache.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * TranslationService handles message translation using OpenAI API with caching
 */
export class TranslationService {
  /**
   * Translate a message to the target language
   * Checks cache first, then calls OpenAI API if not cached
   * 
   * @param content - Original message content
   * @param targetLanguage - Target language code (e.g., 'en', 'es', 'fr')
   * @param sourceLanguage - Optional source language code
   * @returns Translated message content
   */
  async translateMessage(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    try {
      // Check cache first
      const cachedTranslation = await cacheService.getTranslation(content, targetLanguage);
      
      if (cachedTranslation) {
        console.log(`Translation cache hit for target language: ${targetLanguage}`);
        return cachedTranslation;
      }
      
      console.log(`Translation cache miss, calling OpenAI API for target language: ${targetLanguage}`);
      
      // Build the translation prompt
      const systemPrompt = `You are a professional translator. Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.`;
      
      const userPrompt = sourceLanguage
        ? `Translate this text from ${sourceLanguage} to ${targetLanguage}: ${content}`
        : `Translate this text to ${targetLanguage}: ${content}`;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
        max_tokens: 1000,
      });
      
      const translation = response.choices[0]?.message?.content?.trim();
      
      if (!translation) {
        throw new Error('OpenAI API returned empty translation');
      }
      
      // Cache the translation
      await cacheService.setTranslation(content, targetLanguage, translation);
      
      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      
      // Handle translation failures gracefully
      // Return original content with error indicator
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Translate a message with graceful error handling
   * Returns original content if translation fails
   * 
   * @param content - Original message content
   * @param targetLanguage - Target language code
   * @param sourceLanguage - Optional source language code
   * @returns Object with translated content and error flag
   */
  async translateMessageSafe(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<{ translation: string; error: boolean }> {
    try {
      const translation = await this.translateMessage(content, targetLanguage, sourceLanguage);
      return { translation, error: false };
    } catch (error) {
      console.error('Translation failed, returning original content:', error);
      return { translation: content, error: true };
    }
  }
}

// Export singleton instance
export const translationService = new TranslationService();
