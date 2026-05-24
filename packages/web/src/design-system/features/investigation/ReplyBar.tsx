import React, { useState } from 'react';
import { Reply, X } from 'lucide-react';

interface ReplyBarProps {
  replyingTo: { id: string; senderName: string; content: string } | null;
  onCancel: () => void;
}

export function ReplyBar({ replyingTo, onCancel }: ReplyBarProps) {
  if (!replyingTo) return null;

  return (
    <div className="ir-reply-bar">
      <div className="ir-reply-content">
        <Reply size={14} />
        <span>Replying to <strong>{replyingTo.senderName}</strong></span>
        <span className="ir-reply-preview">{replyingTo.content.slice(0, 60)}...</span>
      </div>
      <button onClick={onCancel}><X size={14} /></button>
    </div>
  );
}
