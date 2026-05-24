import React from 'react';
import { Pin, User, Copy, Edit2, Trash2 } from 'lucide-react';
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
  // Basic markdown + mentions
  let processed = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  // Mentions
  const parts = processed.split(/(@[A-Za-z0-9_ ]{2,30})/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="mention" dangerouslySetInnerHTML={{ __html: part.trim() }} />;
    }
    return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
  });
}

export function MessageBubble({ message, isOwn, isGrouped, currentUserId, onPin, onUnpin }: MessageBubbleProps) {
  const { id, senderName, senderPhotoURL, content, contentType, aiCard, isPinned, createdAt } = message;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    // Could add toast here
  };

  return (
    <div className={`ir-msg ${isOwn ? 'ir-msg-own' : ''} ${isPinned ? 'ir-msg-pinned' : ''} ${isGrouped ? 'ir-msg-grouped' : ''}`}>
      <div className="ir-msg-avatar" title={senderName}>
        {senderPhotoURL ? (
          <img src={senderPhotoURL} alt={senderName} />
        ) : (
          <User size={15} />
        )}
      </div>
      <div className="ir-msg-body">
        <div className="ir-msg-header">
          <span className="ir-msg-name">{senderName}</span>
          <span className="ir-msg-time">{formatTime(createdAt)}</span>
          <button
            className="ir-msg-pin-btn"
            onClick={() => isPinned ? onUnpin?.(id) : onPin?.(id)}
            title={isPinned ? 'Unpin from evidence' : 'Pin to evidence board'}
          >
            <Pin size={13} style={{ fill: isPinned ? 'currentColor' : 'none' }} />
          </button>
          <button className="ir-msg-action-btn" onClick={handleCopy} title="Copy message">
            <Copy size={12} />
          </button>
          {isOwn && (
            <>
              <button 
                className="ir-msg-action-btn" 
                title="Edit"
                onClick={() => {
                  const newContent = prompt('Edit message:', content);
                  if (newContent !== null) {
                    // TODO: call edit API
                    console.log('Edit message', id, newContent);
                  }
                }}
              >
                <Edit2 size={12} />
              </button>
              <button 
                className="ir-msg-action-btn" 
                title="Delete"
                onClick={() => {
                  if (confirm('Delete this message?')) {
                    // TODO: call delete API
                    console.log('Delete message', id);
                  }
                }}
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
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
