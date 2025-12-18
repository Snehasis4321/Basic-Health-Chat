'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMessages } from '@/hooks/useMessages';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatRoomProps {
  roomId: string;
  role: 'patient' | 'doctor';
  token?: string | null;
  onLeave?: () => void;
}

interface Message {
  id: string;
  roomId: string;
  senderRole: 'patient' | 'doctor';
  senderId: string | null;
  content: string;
  translatedContent?: string;
  language: string;
  targetLanguage?: string;
  timestamp: Date;
  isAudio: boolean;
}

export default function ChatRoom({ roomId, role, token, onLeave }: ChatRoomProps) {
  const [language, setLanguage] = useState('en');
  const [cipherKey, setCipherKey] = useState<string | null>(null);

  // Fetch messages with lazy loading support
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    hasMore,
    loadMore,
    addMessage,
  } = useMessages({
    roomId,
    token,
    limit: 50,
  });

  // Initialize WebSocket connection
  const {
    socket,
    connected,
    connecting,
    error: wsError,
    sendMessage,
    leaveRoom,
    reconnect,
  } = useWebSocket({
    roomId,
    role,
    token,
    language,
    onRoomJoined: (data) => {
      console.log('Room joined:', data);
    },
    onUserJoined: (data) => {
      console.log('User joined:', data);
    },
    onUserLeft: (data) => {
      console.log('User left:', data);
    },
    onNewMessage: (data) => {
      console.log('New message:', data);
      // Add the new message to the list
      const newMessage: Message = {
        id: data.id || `temp-${Date.now()}`,
        roomId: data.roomId || roomId,
        senderRole: data.senderRole,
        senderId: data.senderId || null,
        content: data.content,
        translatedContent: data.translatedContent,
        language: data.language || 'en',
        targetLanguage: data.targetLanguage,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        isAudio: data.isAudio || false,
      };
      addMessage(newMessage);
    },
    onMessageTranslated: (data) => {
      console.log('Message translated:', data);
      // Update message with translation if needed
    },
    onCipherKeyExchange: (data) => {
      console.log('Cipher key exchanged');
      setCipherKey(data.cipherKey);
    },
    onCipherKeyInvalidated: (data) => {
      console.log('Cipher key invalidated:', data.reason);
      setCipherKey(null);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Load cipher key from session storage
  useEffect(() => {
    const storedKey = sessionStorage.getItem(`room_${roomId}_key`);
    if (storedKey) {
      setCipherKey(storedKey);
    }
  }, [roomId]);

  const handleLeave = () => {
    leaveRoom();
    onLeave?.();
  };

  const handleSendMessage = (content: string) => {
    if (!connected) {
      console.error('Cannot send message: not connected');
      return;
    }
    sendMessage(content, language);
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    if (!connected || !socket) {
      console.error('Cannot send audio: not connected');
      return;
    }

    try {
      // Convert blob to array buffer for transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Emit audio chunks to server
      socket.emit('audio_chunk', {
        audio: arrayBuffer,
        language: language,
      });
    } catch (error) {
      console.error('Error sending audio:', error);
    }
  };

  const handleRequestTTS = (messageId: string, text: string, ttsLanguage: string) => {
    if (!connected || !socket) {
      console.error('Cannot request TTS: not connected');
      return;
    }

    // Request TTS generation from server
    socket.emit('request_tts', {
      messageId,
      text,
      language: ttsLanguage,
    });

    // Listen for audio stream response
    socket.once('audio_stream', (data: { messageId: string; audio: ArrayBuffer }) => {
      if (data.messageId === messageId) {
        // Convert array buffer to blob
        const audioBlob = new Blob([data.audio], { type: 'audio/mpeg' });
        
        // Load audio into the player
        const player = (window as any)[`audioPlayer_${messageId}`];
        if (player && player.loadAudio) {
          player.loadAudio(audioBlob);
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {connecting ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Room:</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{roomId.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector - Placeholder for now */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>

            {!connected && !connecting && (
              <button
                onClick={reconnect}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Reconnect
              </button>
            )}

            <button
              onClick={handleLeave}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Mobile Room ID */}
        <div className="sm:hidden mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Room:</span>
          <span className="text-xs font-mono text-gray-900 dark:text-white">{roomId}</span>
        </div>

        {/* Error Banner */}
        {wsError && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-300">{wsError}</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        {messagesError ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load messages</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">{messagesError}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentRole={role}
            onLoadMore={loadMore}
            onRequestTTS={handleRequestTTS}
            loading={messagesLoading}
            hasMore={hasMore}
          />
        )}
      </main>

      {/* Message Input Area */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          disabled={!connected}
          placeholder={connected ? 'Type your message...' : 'Connecting...'}
        />
      </footer>
    </div>
  );
}
