import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
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
  onMentionChange?: (filter: string, cursorPosition: number) => void;
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="ir-chat-input-area" ref={containerRef}>
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
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message... Use @ to mention or @FT MAVERIICK for AI'}
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
