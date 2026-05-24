// ============================================================
// useMentionAutocomplete — @mention detection and suggestion filtering
// ============================================================

import { useState, useCallback, useMemo } from 'react';

interface Member {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: string;
}

const FT_MAVERIICK: Member = {
  uid: 'ft_maverick',
  displayName: 'FT MAVERIICK',
  photoURL: undefined,
  role: 'ai',
};

export function useMentionAutocomplete(
  value: string,
  cursorPosition: number,
  members: Member[]
) {
  const getMentionState = useCallback((text: string, cursor: number) => {
    // Find the @word being typed
    const before = text.slice(0, cursor);
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) return null;

    // Check if there's a space between @ and cursor
    const afterAt = before.slice(atIndex + 1);
    if (afterAt.includes(' ')) return null;

    const filter = afterAt.toLowerCase();

    // Combine room members + FT MAVERIICK synthetic suggestion
    const allSuggestions = [...members];
    if (!allSuggestions.some(m => m.uid === 'ft_maverick')) {
      allSuggestions.push(FT_MAVERIICK);
    }

    const suggestions = allSuggestions.filter(m =>
      m.displayName.toLowerCase().includes(filter)
    );

    return { filter, suggestions, atIndex };
  }, [members]);

  const mentionState = useMemo(
    () => getMentionState(value, cursorPosition),
    [value, cursorPosition, getMentionState]
  );

  const applyMention = useCallback((member: Member) => {
    if (!mentionState) return value;
    const beforeMention = value.slice(0, mentionState.atIndex);
    const afterMention = value.slice(cursorPosition);
    return `${beforeMention}@${member.displayName} ${afterMention}`;
  }, [mentionState, value, cursorPosition]);

  return {
    isActive: !!mentionState,
    suggestions: mentionState?.suggestions || [],
    filter: mentionState?.filter || '',
    atIndex: mentionState?.atIndex ?? -1,
    applyMention,
  };
}
