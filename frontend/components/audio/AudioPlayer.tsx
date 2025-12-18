'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  messageId: string;
  text: string;
  language?: string;
  onRequestTTS: (messageId: string, text: string, language: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function AudioPlayer({
  messageId,
  text,
  language = 'en',
  onRequestTTS,
  onError,
  disabled = false,
  size = 'md',
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element
  useEffect(() => {
    audioRef.current = new Audio();
    
    audioRef.current.onended = () => {
      setIsPlaying(false);
    };
    
    audioRef.current.onerror = () => {
      setError('Failed to play audio');
      setIsPlaying(false);
      setIsLoading(false);
      onError?.('Failed to play audio');
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [onError]);

  // Update audio source when URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
    }
  }, [audioUrl]);

  const handlePlay = useCallback(async () => {
    if (isLoading || disabled) return;

    try {
      // If we already have audio loaded, just play/pause
      if (audioUrl && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
        return;
      }

      // Otherwise, request TTS generation
      setIsLoading(true);
      setError(null);
      onRequestTTS(messageId, text, language);

    } catch (err) {
      console.error('Error playing audio:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to play audio';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [audioUrl, isPlaying, isLoading, disabled, messageId, text, language, onRequestTTS, onError]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  // Public method to receive audio data from parent
  const loadAudio = useCallback((audioBlob: Blob) => {
    try {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsLoading(false);
      
      // Auto-play after loading
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Error auto-playing audio:', err);
          setError('Failed to play audio');
          onError?.('Failed to play audio');
        });
      }
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Failed to load audio');
      setIsLoading(false);
      onError?.('Failed to load audio');
    }
  }, [onError]);

  // Expose loadAudio method via ref (if needed by parent)
  useEffect(() => {
    // Store reference for parent component access if needed
    (window as any)[`audioPlayer_${messageId}`] = { loadAudio };
    
    return () => {
      delete (window as any)[`audioPlayer_${messageId}`];
    };
  }, [messageId, loadAudio]);

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonSize = size === 'sm' ? 'p-1.5' : 'p-2';

  if (error) {
    return (
      <button
        onClick={handlePlay}
        disabled={disabled}
        className={`${buttonSize} bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Retry audio playback"
        title={error}
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={`${buttonSize} bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-wait`}
        aria-label="Loading audio"
      >
        <svg
          className={`${iconSize} animate-spin`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handlePlay}
        disabled={disabled}
        className={`${buttonSize} bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        title={isPlaying ? 'Pause' : 'Play audio'}
      >
        {isPlaying ? (
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {isPlaying && (
        <button
          onClick={handleStop}
          disabled={disabled}
          className={`${buttonSize} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Stop audio"
          title="Stop"
        >
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      )}
    </div>
  );
}
