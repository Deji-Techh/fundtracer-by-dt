import React from 'react';
import { Pin } from 'lucide-react';

interface PinnedBarProps {
  pinnedMessages: any[];
  onJump: (id: string) => void;
}

export function PinnedBar({ pinnedMessages, onJump }: PinnedBarProps) {
  if (!pinnedMessages.length) return null;

  return (
    <div className="ir-pinned-bar">
      <Pin size={14} />
      <span>{pinnedMessages.length} pinned</span>
      <button onClick={() => onJump(pinnedMessages[0].id)}>Jump to first</button>
    </div>
  );
}
