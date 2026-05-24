import React from 'react';

const REACTIONS = ['👍', '❤️', '👀', '🚀', '🔥'];

interface MessageReactionsProps {
  messageId: string;
  reactions: Record<string, string[]>;
  onReact: (emoji: string) => void;
}

export function MessageReactions({ messageId, reactions, onReact }: MessageReactionsProps) {
  return (
    <div className="ir-reactions">
      {REACTIONS.map(emoji => {
        const count = reactions[emoji]?.length || 0;
        return (
          <button 
            key={emoji} 
            className={`ir-reaction ${count > 0 ? 'active' : ''}`}
            onClick={() => onReact(emoji)}
          >
            {emoji} {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
