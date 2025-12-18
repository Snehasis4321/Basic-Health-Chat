'use client';

import { useRef, useEffect } from 'react';
import AudioPlayer from '../audio/AudioPlayer';

interface Message {
  id: string;
  roomId: string;
  senderRole: 'patient' | 'doctor';
  content: string;
  translatedContent?: string;
  language: string;
  targetLanguage?: string;
  timestamp: Date;
  isAudio: boolean;
}

interface MessageListProps {
  messages: Message[];
  currentRole: 'patient' | 'doctor';
  onLoadMore?: () => void;
  onRequestTTS?: (messageId: string, text: string, language: string) => void; // Deprecated - AudioPlayer handles TTS internally
  loading?: boolean;
  hasMore?: boolean;
}

export default function MessageList({
  messages,
  currentRole,
  onLoadMore,
  loading = false,
  hasMore = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isInitialScrollRef = useRef(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && bottomRef.current) {
      // Always scroll to bottom on initial load
      if (isInitialScrollRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'auto' });
        isInitialScrollRef.current = false;
      } else {
        // For new messages, always scroll to bottom with smooth animation
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!topSentinelRef.current || !onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          // Store current scroll height before loading more
          if (scrollRef.current) {
            prevScrollHeightRef.current = scrollRef.current.scrollHeight;
          }
          onLoadMore();
        }
      },
      {
        root: scrollRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(topSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, loading, hasMore]);

  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (scrollRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      scrollRef.current.scrollTop += scrollDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  const formatTime = (date: Date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();

    if (isToday) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      return messageDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const getRoleLabel = (role: 'patient' | 'doctor') => {
    return role === 'patient' ? 'Patient' : 'Doctor';
  };

  const getRoleColor = (role: 'patient' | 'doctor') => {
    return role === 'patient' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30';
  };

  const getRoleBadgeColor = (role: 'patient' | 'doctor') => {
    return role === 'patient'
      ? 'bg-blue-600 dark:bg-blue-500 text-white'
      : 'bg-green-600 dark:bg-green-500 text-white';
  };

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start the conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-6 space-y-4">
      {/* Top sentinel for lazy loading */}
      {hasMore && (
        <div ref={topSentinelRef} className="h-1">
          {loading && (
            <div className="flex justify-center py-2">
              <svg
                className="animate-spin h-6 w-6 text-gray-400"
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
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => {
        const isOwnMessage = message.senderRole === currentRole;
        const displayContent = message.translatedContent || message.content;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
                isOwnMessage ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message header */}
              <div
                className={`flex items-center gap-2 mb-1 ${
                  isOwnMessage ? 'justify-end' : 'justify-start'
                }`}
              >
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                    message.senderRole
                  )}`}
                >
                  {getRoleLabel(message.senderRole)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(message.timestamp)}
                </span>
                {message.isAudio && (
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
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
                )}
              </div>

              {/* Message bubble */}
              <div
                className={`rounded-lg px-4 py-3 ${
                  isOwnMessage
                    ? getRoleColor(currentRole)
                    : getRoleColor(message.senderRole)
                }`}
              >
                {/* Check if we have both original and translated content */}
                {message.translatedContent && message.content !== message.translatedContent ? (
                  <div className="space-y-3">
                    {/* Translated text section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                            Translated ({message.targetLanguage || 'auto'})
                          </span>
                        </div>
                        {/* Audio Player Button for translated text */}
                        <AudioPlayer
                          messageId={message.id}
                          text={message.translatedContent}
                          language={message.targetLanguage || message.language}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                        {message.translatedContent}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-300/50 dark:border-gray-600/50"></div>

                    {/* Original text section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                            Original ({message.language})
                          </span>
                        </div>
                        {/* Audio Player Button for original text */}
                        <AudioPlayer
                          messageId={`${message.id}-original`}
                          text={message.content}
                          language={message.language}
                          size="sm"
                        />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed opacity-90">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Single language message (no translation) */
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed flex-1">
                      {displayContent}
                    </p>
                    {/* Audio Player Button */}
                    <div className="flex-shrink-0 pt-0.5">
                      <AudioPlayer
                        messageId={message.id}
                        text={displayContent}
                        language={message.language}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom anchor for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
