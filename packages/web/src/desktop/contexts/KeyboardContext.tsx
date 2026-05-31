import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

type KeyboardAction =
  | 'scroll-down' | 'scroll-up' | 'scroll-half-down' | 'scroll-half-up'
  | 'scroll-top' | 'scroll-bottom'
  | 'next-tab' | 'prev-tab' | 'close-tab' | 'new-tab'
  | 'focus-search' | 'focus-input'
  | 'show-hints' | 'show-help'
  | 'export-report' | 'quit';

interface KeyboardContextType {
  vimMode: boolean;
  toggleVimMode: () => void;
  showHints: boolean;
  setShowHints: (v: boolean) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [vimMode, setVimMode] = useState(() => {
    try { return localStorage.getItem('fdt_vim_mode') === 'true'; }
    catch { return false; }
  });
  const [showHints, setShowHints] = useState(false);

  const toggleVimMode = useCallback(() => {
    setVimMode(v => {
      const next = !v;
      try { localStorage.setItem('fdt_vim_mode', String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (!vimMode) return;

    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape to clear focus / close modals
      if (e.key === 'Escape' && !isInput) {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // Don't intercept when typing in inputs (except for Escape)
      if (isInput) return;

      // Don't intercept with modifier keys (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'j':
          window.scrollBy({ top: 60, behavior: 'smooth' });
          break;
        case 'k':
          window.scrollBy({ top: -60, behavior: 'smooth' });
          break;
        case 'h':
          // Shift-tab left through analysis tabs
          break;
        case 'l':
          // Shift-tab right through analysis tabs
          break;
        case 'g':
          // Double-g for scroll to top — tracked in a timeout
          break;
        case 'G':
          if (e.shiftKey) {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        case 'd':
          // dd = close current tab — double-tap detection
          break;
        case 't':
          // new tab
          break;
        case '/':
          e.preventDefault();
          // Focus command palette
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
          break;
        case 'f':
          setShowHints(true);
          setTimeout(() => setShowHints(false), 2000);
          break;
        case '?':
          setShowHints(v => !v);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vimMode]);

  return (
    <KeyboardContext.Provider value={{ vimMode, toggleVimMode, showHints, setShowHints }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) throw new Error('useKeyboard must be used within KeyboardProvider');
  return ctx;
}
