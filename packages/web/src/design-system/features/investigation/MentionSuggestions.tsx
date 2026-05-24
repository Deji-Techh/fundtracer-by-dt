import React from 'react';

interface Member {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

interface MentionSuggestionsProps {
  suggestions: Member[];
  activeIndex: number;
  onSelect: (member: Member) => void;
  position: { top: number; left: number };
}

export function MentionSuggestions({ suggestions, activeIndex, onSelect, position }: MentionSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="ir-mention-suggestions"
      style={{ position: 'absolute', bottom: '100%', left: 0 }}
    >
      {suggestions.map((member, i) => (
        <button
          key={member.uid}
          className={`ir-mention-item ${i === activeIndex ? 'selected' : ''}`}
          onClick={() => onSelect(member)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="ir-mention-avatar">
            {member.photoURL ? (
              <img src={member.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted, #555)',
              }}>
                {member.displayName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span>{member.displayName}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted, #555)' }}>
            {member.role}
          </span>
        </button>
      ))}
    </div>
  );
}
