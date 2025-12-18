import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { ttsService } from '../services/tts.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const router: RouterType = Router();

// Directory to store TTS audio files
const TTS_AUDIO_DIR = path.join(process.cwd(), 'public', 'tts-audio');

// Ensure directory exists
if (!fs.existsSync(TTS_AUDIO_DIR)) {
  fs.mkdirSync(TTS_AUDIO_DIR, { recursive: true });
}

/**
 * Generate a unique filename for TTS audio based on text and language
 */
function generateAudioFilename(text: string, language: string): string {
  const hash = crypto.createHash('md5').update(`${text}-${language}`).digest('hex');
  return `${hash}.mp3`;
}

/**
 * POST /api/tts/generate
 * Generate TTS audio and return URL to the audio file
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, language = 'en' } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate filename based on text hash (for caching)
    const filename = generateAudioFilename(text, language);
    const filePath = path.join(TTS_AUDIO_DIR, filename);

    // Check if file already exists (cached)
    if (fs.existsSync(filePath)) {
      console.log(`[TTS] Serving cached audio: ${filename}`);
      return res.json({
        success: true,
        audioUrl: `/tts-audio/${filename}`,
        cached: true,
      });
    }

    // Generate audio
    console.log(`[TTS] Generating audio for language: ${language}`);
    const audioBuffer = await ttsService.generateSpeech(text, language);

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(500).json({ error: 'Failed to generate audio' });
    }

    // Save to file
    fs.writeFileSync(filePath, audioBuffer);
    console.log(`[TTS] Saved audio to: ${filePath} (${audioBuffer.length} bytes)`);

    return res.json({
      success: true,
      audioUrl: `/tts-audio/${filename}`,
      cached: false,
    });
  } catch (error) {
    console.error('[TTS] Error generating audio:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate audio',
    });
  }
});

/**
 * GET /api/tts/audio/:filename
 * Serve TTS audio file
 */
router.get('/audio/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // Validate filename (only allow alphanumeric and .mp3)
    if (!/^[a-f0-9]+\.mp3$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(TTS_AUDIO_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('[TTS] Error serving audio:', error);
    return res.status(500).json({ error: 'Failed to serve audio' });
  }
});

export default router;
