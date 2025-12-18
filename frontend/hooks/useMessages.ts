'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

interface UseMessagesOptions {
  roomId: string;
  token?: string | null;
  limit?: number;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  addMessage: (message: Message) => void;
  refresh: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useMessages({
  roomId,
  token,
  limit = 50,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Use ref to track loading state to avoid dependency issues
  const loadingRef = useRef(false);

  // Fetch messages from API
  const fetchMessages = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add authorization header if token is provided (for doctors)
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}/api/rooms/${roomId}/messages?limit=${limit}&offset=${currentOffset}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        // Messages come from API in DESC order (newest first)
        // Reverse to get chronological order (oldest first) for display
        const fetchedMessages: Message[] = data.messages
          .map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          .reverse();

        if (append) {
          // Prepend older messages at the beginning (for lazy loading)
          setMessages((prev) => [...fetchedMessages, ...prev]);
        } else {
          // Replace messages (for initial load or refresh)
          setMessages(fetchedMessages);
        }

        // Check if there are more messages
        setHasMore(fetchedMessages.length === limit);
        setOffset(currentOffset + fetchedMessages.length);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [roomId, token, limit]
  );

  // Initial load
  useEffect(() => {
    setMessages([]);
    setOffset(0);
    setHasMore(true);
    fetchMessages(0, false);
  }, [roomId]); // Only re-fetch when roomId changes

  // Load more messages (for lazy loading)
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMore) {
      fetchMessages(offset, true);
    }
  }, [fetchMessages, offset, hasMore]);

  // Add a new message (from WebSocket)
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // Refresh messages
  const refresh = useCallback(() => {
    setMessages([]);
    setOffset(0);
    setHasMore(true);
    fetchMessages(0, false);
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    addMessage,
    refresh,
  };
}
