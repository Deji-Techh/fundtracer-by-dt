import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pin, User, Copy, Edit2, Trash2 } from 'lucide-react';
import { AiCardContent } from './AiCardContent';
import { API_BASE, getAuthToken } from '../../../api';
import { useNotify } from '../../../contexts/ToastContext';

interface MessageData {
  id: string;
  roomId?: string;
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
  let processed = content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  const parts = processed.split(/(@\w{2,30})\b/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="mention" dangerouslySetInnerHTML={{ __html: part.trim() }} />;
    }
    return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
  });
}

export function MessageBubble({ message, isOwn, isGrouped, currentUserId, onPin, onUnpin }: MessageBubbleProps) {
  const notify = useNotify();
  const { id, senderName, senderPhotoURL, content, contentType, aiCard, isPinned, createdAt } = message;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      notify.success('Copied to clipboard');
    } catch {
      notify.error('Failed to copy');
    }
    setCtxMenu(null);
  }, [content, notify]);

  const handleEdit = useCallback(async () => {
    setCtxMenu(null);
    const newContent = prompt('Edit message:', content);
    if (newContent !== null && newContent.trim() !== content) {
      try {
        const token = getAuthToken();
        await fetch(`${API_BASE}/api/rooms/${message.roomId}/messages/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ content: newContent.trim() }),
        });
        window.location.reload();
      } catch {
        notify.error('Failed to edit message');
      }
    }
  }, [content, id, message.roomId, notify]);

  const handleDelete = useCallback(async () => {
    setCtxMenu(null);
    if (!confirm('Delete this message?')) return;
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE}/api/rooms/${message.roomId}/messages/${id}`, {
        method: 'DELETE',
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      notify.success('Message deleted');
    } catch {
      notify.error('Failed to delete message');
    }
  }, [id, message.roomId, notify]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      ref={msgRef}
      className={`ir-msg ${isOwn ? 'ir-msg-own' : ''} ${isPinned ? 'ir-msg-pinned' : ''} ${isGrouped ? 'ir-msg-grouped' : ''}`}
      onContextMenu={handleContextMenu}
    >
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
        </div>

        {contentType === 'ai_card' && aiCard ? (
          <AiCardContent data={aiCard} />
        ) : (
          <div className="ir-msg-content">{renderContent(content)}</div>
        )}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          ref={menuRef}
          className="ir-context-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button className="ir-context-item" onClick={handleCopy}>
            <Copy size={14} />
            <span>Copy</span>
          </button>
          {isOwn && (
            <>
              <button className="ir-context-item" onClick={handleEdit}>
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
              <div className="ir-context-divider" />
              <button className="ir-context-item ir-context-item-danger" onClick={handleDelete}>
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}