import React from 'react';

interface TypingIndicatorProps {
  names: string[];
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const text = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="ir-typing">
      <div className="ir-typing-dots">
        <span />
        <span />
        <span />
      </div>
      <span>{text}</span>
    </div>
  );
}
