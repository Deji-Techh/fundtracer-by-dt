import React from 'react';
import { Plus, Search, ArrowDown, Users, Pin } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  onScrollToBottom: () => void;
  currentRoomId: string | null;
}

export function CommandPalette({ isOpen, onClose, onCreateRoom, onScrollToBottom }: CommandPaletteProps) {
  if (!isOpen) return null;

  const commands = [
    { icon: Plus, label: 'Create new room', action: onCreateRoom, shortcut: 'N' },
    { icon: ArrowDown, label: 'Scroll to bottom', action: onScrollToBottom, shortcut: 'J' },
    { icon: Search, label: 'Search messages', action: () => {}, shortcut: '/' },
    { icon: Pin, label: 'View pinned evidence', action: () => {}, shortcut: 'P' },
    { icon: Users, label: 'Invite team member', action: () => {}, shortcut: 'I' },
  ];

  return (
    <div className="ir-command-overlay" onClick={onClose}>
      <div className="ir-command-palette" onClick={e => e.stopPropagation()}>
        <div className="ir-command-header">
          <input 
            className="ir-command-input" 
            placeholder="Type a command or search..." 
            autoFocus 
          />
        </div>
        <div className="ir-command-list">
          {commands.map((cmd, idx) => (
            <button 
              key={idx} 
              className="ir-command-item"
              onClick={() => { cmd.action(); onClose(); }}
            >
              <cmd.icon size={16} />
              <span>{cmd.label}</span>
              <span className="ir-command-shortcut">{cmd.shortcut}</span>
            </button>
          ))}
        </div>
        <div className="ir-command-footer">
          <span>Press <kbd>ESC</kbd> to close • <kbd>↑↓</kbd> to navigate</span>
        </div>
      </div>
    </div>
  );
}
