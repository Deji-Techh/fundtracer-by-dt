import React from 'react';

interface HistoryMessage {
  id: string;
  senderName: string;
  content: string;
  createdAt: number;
}

interface MessageHistoryProps {
  messages: HistoryMessage[];
  onSelect?: (id: string) => void;
}

export function MessageHistory({ messages, onSelect }: MessageHistoryProps) {
  if (messages.length === 0) {
    return <div className="ir-empty"><p className="ir-empty-text">No messages yet</p></div>;
  }

  return (
    <div>
      {messages.map((msg) => (
        <button
          key={msg.id}
          className="ir-history-item"
          onClick={() => onSelect?.(msg.id)}
        >
          <span style={{ fontWeight: 500, marginRight: 6 }}>{msg.senderName}:</span>
          {msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}
        </button>
      ))}
    </div>
  );
}
