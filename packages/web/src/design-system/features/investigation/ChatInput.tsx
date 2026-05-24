import React, { useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { MentionSuggestions } from './MentionSuggestions';

interface Member {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  onCursorChange?: (cursor: number) => void;
  mentionSuggestions: Member[];
  mentionActive: boolean;
  mentionActiveIndex: number;
  onMentionSelect: (member: Member) => void;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  onCursorChange,
  mentionSuggestions,
  mentionActive,
  mentionActiveIndex,
  onMentionSelect,
  placeholder,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '42px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (mentionActive) return;
      e.preventDefault();
      onSend();
    }
    
    // Slash commands
    if (e.key === 'Tab' && value.startsWith('/')) {
      e.preventDefault();
      // Could expand to show command suggestions
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    onCursorChange?.(e.target.selectionStart);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    onCursorChange?.(e.currentTarget.selectionStart);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onCursorChange?.(e.currentTarget.selectionStart);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Future: upload files
    alert('File upload coming soon');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="ir-chat-input-area" ref={containerRef} onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="ir-chat-input-row" style={{ position: 'relative' }}>
        {mentionActive && mentionSuggestions.length > 0 && (
          <MentionSuggestions
            suggestions={mentionSuggestions}
            activeIndex={mentionActiveIndex}
            onSelect={onMentionSelect}
          />
        )}

        <textarea
          ref={textareaRef}
          className="ir-input"
          value={value}
          onChange={handleChange}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message...  •  /scan, /help, @mention'}
          disabled={disabled}
          rows={1}
        />

        <button
          className="ir-send-btn"
          onClick={onSend}
          disabled={disabled || !value.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
