import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import multer from 'multer';
import { sttService } from '../services/stt.js';

const router: RouterType = Router();

// Configure multer for memory storage (we'll process the buffer directly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI Whisper limit)
  },
  fileFilter: (_req, file, cb) => {
    // Accept common audio formats
    const allowedMimeTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/flac',
      'audio/x-m4a',
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

/**
 * POST /api/stt/transcribe
 * Transcribe audio file to text using OpenAI Whisper
 * 
 * Expects multipart/form-data with:
 * - audio: audio file (required)
 * - language: language code (optional, e.g., 'en', 'es', 'fr')
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        success: false,
      });
    }

    const audioBuffer = req.file.buffer;
    const language = req.body.language as string | undefined;

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ 
        error: 'Audio file is empty',
        success: false,
      });
    }

    console.log(`[STT] Transcribing audio file: ${req.file.originalname} (${audioBuffer.length} bytes)`);

    // Transcribe audio
    const transcription = await sttService.transcribeAudio(audioBuffer, language);

    if (!transcription || transcription.trim().length === 0) {
      return res.status(500).json({ 
        error: 'Transcription returned empty result',
        success: false,
      });
    }

    console.log(`[STT] Transcription successful: "${transcription.substring(0, 50)}..."`);

    return res.json({
      success: true,
      text: transcription,
      language: language || 'auto',
    });
  } catch (error) {
    console.error('[STT] Transcription error:', error);
    
    // Handle specific error types
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File too large. Maximum size is 25MB',
          success: false,
        });
      }
      return res.status(400).json({ 
        error: `File upload error: ${error.message}`,
        success: false,
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      success: false,
    });
  }
});

export default router;
