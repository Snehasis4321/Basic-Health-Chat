'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import AudioRecorder from '../audio/AudioRecorder';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendAudio?: (audioBlob: Blob) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  onSendMessage,
  onSendAudio,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || sending || disabled) {
      return;
    }

    setSending(true);

    try {
      // Send the message
      onSendMessage(trimmedMessage);
      
      // Clear input after successful send
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleAudioData = async (audioBlob: Blob) => {
    if (onSendAudio) {
      setSending(true);
      try {
        await onSendAudio(audioBlob);
        setShowRecorder(false);
      } catch (error) {
        console.error('Error sending audio:', error);
      } finally {
        setSending(false);
      }
    }
  };

  const handleAudioError = (error: string) => {
    console.error('Audio recording error:', error);
    alert(`Audio recording error: ${error}`);
  };

  const toggleRecorder = () => {
    setShowRecorder(!showRecorder);
  };

  // Show audio recorder if active
  if (showRecorder) {
    return (
      <div className="space-y-2">
        <AudioRecorder
          onAudioData={handleAudioData}
          onError={handleAudioError}
          disabled={disabled || sending}
        />
        <button
          onClick={toggleRecorder}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Switch to text input
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      {/* Microphone Button */}
      {onSendAudio && (
        <button
          onClick={toggleRecorder}
          disabled={disabled}
          className="p-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          aria-label="Record audio message"
          title="Record audio"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      )}

      {/* Text Input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          style={{ minHeight: '48px', maxHeight: '150px' }}
        />
        
        {/* Character count (optional) */}
        {message.length > 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
            {message.length}
          </div>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() || disabled || sending}
        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[100px]"
        aria-label="Send message"
      >
        {sending ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
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
            <span className="hidden sm:inline">Sending...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <span className="hidden sm:inline">Send</span>
          </>
        )}
      </button>
    </div>
  );
}
