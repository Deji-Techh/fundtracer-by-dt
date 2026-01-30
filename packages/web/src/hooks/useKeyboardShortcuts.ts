import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        // Allow Escape even in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const altMatch = !!shortcut.alt === event.altKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcuts hook
export function useCommonShortcuts({
  onSearch,
  onClose,
  onEscape,
}: {
  onSearch?: () => void;
  onClose?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      handler: onSearch,
      description: 'Focus search',
    });
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: onClose,
      description: 'Close modal/dialog',
    });
  }

  if (onEscape && !onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: onEscape,
      description: 'Close or go back',
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

export default useKeyboardShortcuts;
