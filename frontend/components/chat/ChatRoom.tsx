'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMessages } from '@/hooks/useMessages';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LanguageSelector from './LanguageSelector';

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
  // Initialize language with default value to avoid hydration mismatch
  const [language, setLanguage] = useState('en');
  const [cipherKey, setCipherKey] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState(false);
  const [participants, setParticipants] = useState<{
    patient: boolean;
    doctor: boolean;
  }>({
    patient: false,
    doctor: false,
  });

  // Load language from session storage after mount to avoid hydration mismatch
  useEffect(() => {
    const storedLanguage = sessionStorage.getItem('preferredLanguage');
    if (storedLanguage) {
      setLanguage(storedLanguage);
    }
  }, []);

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
      // Update participant status from server data (includes existing participants)
      if (data.participants) {
        setParticipants(data.participants);
      } else {
        // Fallback: just mark ourselves as online
        setParticipants((prev) => ({
          ...prev,
          [role]: true,
        }));
      }
    },
    onUserJoined: (data) => {
      console.log('User joined:', data);
      // Update participant status when another user joins
      if (data.role) {
        setParticipants((prev) => ({
          ...prev,
          [data.role]: true,
        }));
      }
    },
    onUserLeft: (data) => {
      console.log('User left:', data);
      // Update participant status when a user leaves
      if (data.role) {
        setParticipants((prev) => ({
          ...prev,
          [data.role]: false,
        }));
      }
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
    onMessageSent: (data) => {
      console.log('Message sent confirmation:', data);
      // Message was already added optimistically, confirmation received
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
      // Error is already handled by useWebSocket hook and displayed in the UI
    },
  });

  // Load cipher key from session storage
  useEffect(() => {
    const storedKey = sessionStorage.getItem(`room_${roomId}_key`);
    if (storedKey) {
      setCipherKey(storedKey);
    }
  }, [roomId]);

  // Reset dismissed error when error changes
  useEffect(() => {
    if (wsError) {
      setDismissedError(false);
    }
  }, [wsError]);

  const handleLeave = () => {
    leaveRoom();
    onLeave?.();
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Store in session storage
    sessionStorage.setItem('preferredLanguage', newLanguage);
    
    // Update language preference on server via WebSocket
    if (connected && socket) {
      socket.emit('update_language', { language: newLanguage });
    }
  };

  const handleSendMessage = (content: string) => {
    if (!connected) {
      console.error('Cannot send message: not connected');
      return;
    }
    
    // Add message optimistically to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      roomId: roomId,
      senderRole: role,
      senderId: null, // Will be set by server for doctors
      content: content,
      language: language,
      timestamp: new Date(),
      isAudio: false,
    };
    addMessage(tempMessage);
    
    sendMessage(content, language);
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
            <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${participants.patient ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Patient</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${participants.doctor ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Doctor</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <LanguageSelector
              value={language}
              onChange={handleLanguageChange}
              disabled={!connected}
            />

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

        {/* Mobile Room ID and Participants */}
        <div className="sm:hidden mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Room:</span>
            <span className="text-xs font-mono text-gray-900 dark:text-white">{roomId}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${participants.patient ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Patient</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${participants.doctor ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Doctor</span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {wsError && !dismissedError && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-300">{wsError}</p>
                  {!connected && !connecting && (
                    <button
                      onClick={reconnect}
                      className="mt-1 text-xs text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 underline"
                    >
                      Try reconnecting
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDismissedError(true)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
            loading={messagesLoading}
            hasMore={hasMore}
          />
        )}
      </main>

      {/* Message Input Area */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!connected}
          placeholder={connected ? 'Type your message...' : 'Connecting...'}
          language={language}
        />
      </footer>
    </div>
  );
}
