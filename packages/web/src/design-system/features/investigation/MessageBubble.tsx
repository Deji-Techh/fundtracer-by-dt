import React from 'react';
import { Pin, User } from 'lucide-react';
import { AiCardContent } from './AiCardContent';

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  content: string;
  contentType: 'text' | 'ai_card' | 'system' | 'pin_notice';
  aiCard?: { command: string; address: string; chain: string; resultSummary: string; resultData?: any };
  mentions: string[];
  isPinned: boolean;
  createdAt: number;
}

interface MessageBubbleProps {
  message: MessageData;
  isOwn: boolean;
  isGrouped?: boolean;
  currentUserId?: string;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderContent(content: string) {
  // Highlight @mentions — matches @word or @multi word
  const parts = content.split(/(@\w+(?:\s+\w+)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="mention">{part}</span>;
    }
    return part;
  });
}

export function MessageBubble({ message, isOwn, isGrouped, currentUserId, onPin, onUnpin }: MessageBubbleProps) {
  const { id, senderName, senderPhotoURL, content, contentType, aiCard, isPinned, createdAt } = message;

  return (
    <div className={`ir-msg ${isOwn ? 'ir-msg-own' : ''} ${isPinned ? 'ir-msg-pinned' : ''} ${isGrouped ? 'ir-msg-grouped' : ''}`}>
      <div className="ir-msg-avatar">
        {senderPhotoURL ? (
          <img src={senderPhotoURL} alt={senderName} />
        ) : (
          <User size={14} />
        )}
      </div>
      <div className="ir-msg-body">
        <div className="ir-msg-header">
          <span className="ir-msg-name">{senderName}</span>
          <span className="ir-msg-time">{formatTime(createdAt)}</span>
          <button
            className="ir-msg-pin-btn"
            onClick={() => isPinned ? onUnpin?.(id) : onPin?.(id)}
            title={isPinned ? 'Unpin' : 'Pin to evidence board'}
          >
            <Pin size={12} style={{ fill: isPinned ? '#00a884' : 'none', color: isPinned ? '#00a884' : undefined }} />
          </button>
        </div>

        {contentType === 'ai_card' && aiCard ? (
          <AiCardContent data={aiCard} />
        ) : (
          <div className="ir-msg-content">{renderContent(content)}</div>
        )}
      </div>
    </div>
  );
}
