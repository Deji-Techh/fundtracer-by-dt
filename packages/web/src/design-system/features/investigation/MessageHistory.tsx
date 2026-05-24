import React from 'react';
import { MessageSquare } from 'lucide-react';

interface RoomSession {
  id: string;
  name: string;
  lastMessagePreview?: string;
  lastMessageAt?: number;
  pinCount: number;
  memberCount: number;
}

interface MessageHistoryProps {
  rooms: RoomSession[];
  activeRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function MessageHistory({ rooms, activeRoomId, onSelectRoom }: MessageHistoryProps) {
  if (rooms.length === 0) {
    return (
      <div className="ir-empty">
        <p className="ir-empty-text">No sessions yet</p>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #555)' }}>
          Create a room to start an investigation session
        </span>
      </div>
    );
  }

  return (
    <div className="ir-session-list">
      {rooms.map((room) => (
        <button
          key={room.id}
          className={`ir-session-item${room.id === activeRoomId ? ' active' : ''}`}
          onClick={() => onSelectRoom?.(room.id)}
        >
          <MessageSquare size={14} className="ir-session-icon" />
          <div className="ir-session-content">
            <span className="ir-session-title">{room.name}</span>
            {room.lastMessagePreview && (
              <span className="ir-session-preview">{room.lastMessagePreview.slice(0, 60)}</span>
            )}
            <span className="ir-session-meta">
              {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
              {room.pinCount > 0 && ` · ${room.pinCount} pinned`}
            </span>
          </div>
          {room.lastMessageAt && (
            <span className="ir-session-time">{formatRelativeTime(room.lastMessageAt)}</span>
          )}
        </button>
      ))}
    </div>
  );
}
