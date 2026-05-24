import React from 'react';

interface SystemMessageProps {
  text: string;
  timestamp: number;
}

export function SystemMessage({ text, timestamp }: SystemMessageProps) {
  return (
    <div className="ir-system-msg">
      {text}
      <span style={{ marginLeft: 6, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
