'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  roomId: string;
  role: 'patient' | 'doctor';
  token?: string | null;
  language?: string;
  onRoomJoined?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onMessageSent?: (data: any) => void;
  onMessageTranslated?: (data: any) => void;
  onCipherKeyExchange?: (data: any) => void;
  onCipherKeyInvalidated?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  sendMessage: (content: string, language?: string) => void;
  leaveRoom: () => void;
  reconnect: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    roomId,
    role,
    token,
    language = 'en',
    onRoomJoined,
    onUserJoined,
    onUserLeft,
    onNewMessage,
    onMessageSent,
    onMessageTranslated,
    onCipherKeyExchange,
    onCipherKeyInvalidated,
    onError,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Store callbacks in refs to avoid recreating initializeSocket
  const callbacksRef = useRef({
    onRoomJoined,
    onUserJoined,
    onUserLeft,
    onNewMessage,
    onMessageSent,
    onMessageTranslated,
    onCipherKeyExchange,
    onCipherKeyInvalidated,
    onError,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onRoomJoined,
      onUserJoined,
      onUserLeft,
      onNewMessage,
      onMessageSent,
      onMessageTranslated,
      onCipherKeyExchange,
      onCipherKeyInvalidated,
      onError,
    };
  }, [onRoomJoined, onUserJoined, onUserLeft, onNewMessage, onMessageSent, onMessageTranslated, onCipherKeyExchange, onCipherKeyInvalidated, onError]);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    setConnecting(true);
    setError(null);

    console.log('Initializing WebSocket connection...');

    // Create socket with authentication
    const socketOptions: any = {
      transports: ['websocket', 'polling'],
      reconnection: false, // We'll handle reconnection manually
    };

    // Add token for doctor authentication
    if (role === 'doctor' && token) {
      socketOptions.auth = { token };
    }

    const newSocket = io(SOCKET_URL, socketOptions);
    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setConnected(true);
      setConnecting(false);
      setError(null);
      reconnectAttempts.current = 0;

      // Join the room
      newSocket.emit('join_room', {
        roomId,
        role,
        language,
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
      
      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setConnecting(false);
      setError('Failed to connect to server');
      attemptReconnect();
    });

    // Room event handlers
    newSocket.on('room_joined', (data) => {
      console.log('Room joined:', data);
      callbacksRef.current.onRoomJoined?.(data);
    });

    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data);
      callbacksRef.current.onUserJoined?.(data);
    });

    newSocket.on('user_left', (data) => {
      console.log('User left:', data);
      callbacksRef.current.onUserLeft?.(data);
    });

    // Message event handlers
    newSocket.on('new_message', (data) => {
      console.log('New message received:', data);
      callbacksRef.current.onNewMessage?.(data);
    });

    newSocket.on('message_translated', (data) => {
      console.log('Message translated:', data);
      callbacksRef.current.onMessageTranslated?.(data);
    });

    newSocket.on('message_sent', (data) => {
      console.log('Message sent confirmation:', data);
      callbacksRef.current.onMessageSent?.(data);
    });

    // Cipher key event handlers
    newSocket.on('cipher_key_exchange', (data) => {
      console.log('Cipher key exchanged');
      callbacksRef.current.onCipherKeyExchange?.(data);
    });

    newSocket.on('cipher_key_invalidated', (data) => {
      console.log('Cipher key invalidated:', data.reason);
      callbacksRef.current.onCipherKeyInvalidated?.(data);
    });

    // Error handler
    newSocket.on('error', (err) => {
      console.error('WebSocket error:', err);
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      callbacksRef.current.onError?.(err);
    });

    // Handle specific error events
    newSocket.on('stt_error', (data) => {
      console.error('STT error:', data);
      setError(data.message || 'Audio transcription failed');
      callbacksRef.current.onError?.(data);
    });

    newSocket.on('tts_error', (data) => {
      console.error('TTS error:', data);
      // Don't set global error for TTS failures, let the component handle it
      callbacksRef.current.onError?.(data);
    });

    setSocket(newSocket);
  }, [roomId, role, token, language]);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      setError('Unable to reconnect to server. Please refresh the page.');
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      
      // Clean up old socket
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
      }
      
      // Initialize new connection
      initializeSocket();
    }, delay);
  }, [initializeSocket]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    reconnectAttempts.current = 0;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
    }
    
    initializeSocket();
  }, [initializeSocket]);

  // Send message function
  const sendMessage = useCallback((content: string, msgLanguage?: string) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send message: socket not connected');
      setError('Not connected to server');
      return;
    }

    socketRef.current.emit('send_message', {
      content,
      language: msgLanguage || language,
    });
  }, [language]);

  // Leave room function
  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room');
      socketRef.current.disconnect();
    }
  }, []);

  // Initialize socket on mount
  useEffect(() => {
    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, [initializeSocket]);

  return {
    socket,
    connected,
    connecting,
    error,
    sendMessage,
    leaveRoom,
    reconnect,
  };
}
