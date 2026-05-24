import React, { useRef, useEffect, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { TypingIndicator } from './TypingIndicator';
import { AiCardSkeleton } from './AiCardContent';

interface RoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  content: string;
  contentType: 'text' | 'ai_card' | 'system' | 'pin_notice';
  aiCard?: any;
  mentions: string[];
  isPinned: boolean;
  createdAt: number;
  roomId: string;
}

interface ChatMessageListProps {
  messages: RoomMessage[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  currentUserId?: string;
  typingNames: string[];
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  isProcessingAi: boolean;
}

export function ChatMessageList({
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
  currentUserId,
  typingNames,
  onPin,
  onUnpin,
  isProcessingAi,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  useEffect(() => {
    if (containerRef.current && prevMessageCount.current === 0 && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [typingNames]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingMore) return;
    if (el.scrollTop < 60) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <div className="ir-chat-messages" ref={containerRef}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="ir-msg">
            <div className="ir-msg-avatar">
              <div className="ir-ai-skeleton-row" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            </div>
            <div className="ir-msg-body">
              <div className="ir-ai-skeleton" style={{ gap: 6 }}>
                <div className="ir-ai-skeleton-row" style={{ width: '30%' }} />
                <div className="ir-ai-skeleton-row" style={{ width: i === 1 ? '60%' : '80%' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0 && !isProcessingAi) {
    return (
      <div className="ir-chat-messages" ref={containerRef}>
        <div className="ir-empty">
          <p className="ir-empty-text">No messages yet</p>
          <p className="ir-empty-sub">
            Send a message to start the conversation.<br />
            Type <span style={{ color: '#00a884' }}>@FT MAVERIICK</span> to run blockchain analysis in the chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ir-chat-messages" ref={containerRef} onScroll={handleScroll}>
      {isLoadingMore && (
        <div style={{ textAlign: 'center', padding: 12, opacity: 0.5 }}>
          <div className="ir-ai-skeleton-row" style={{ width: 100, height: 10, margin: '0 auto' }} />
        </div>
      )}

      {messages.map((msg, idx) => {
        const prev = idx > 0 ? messages[idx - 1] : null;
        const isGrouped = prev !== null && prev.senderId === msg.senderId && msg.contentType !== 'system' && prev.contentType !== 'system';

        if (msg.contentType === 'system' || msg.contentType === 'pin_notice') {
          return <SystemMessage key={msg.id} text={msg.content} timestamp={msg.createdAt} />;
        }
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === currentUserId}
            isGrouped={isGrouped}
            currentUserId={currentUserId}
            onPin={onPin}
            onUnpin={onUnpin}
          />
        );
      })}

      {isProcessingAi && <AiCardSkeleton />}

      <TypingIndicator names={typingNames} />
      <div ref={bottomRef} />

      {/* Scroll to bottom FAB */}
      <button 
        className="ir-scroll-fab"
        onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
        title="Scroll to bottom"
      >
        ↓
      </button>
    </div>
  );
}
