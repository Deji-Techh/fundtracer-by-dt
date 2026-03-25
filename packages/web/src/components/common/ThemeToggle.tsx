import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

type ThemeOption = 'light' | 'dim' | 'dark';

const themes: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
  { 
    value: 'light', 
    label: 'Light',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    )
  },
  { 
    value: 'dim', 
    label: 'Dim',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    )
  },
  { 
    value: 'dark', 
    label: 'Dark',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    )
  },
];

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = themes.find(t => t.value === theme);

  if (isMobile) {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all var(--transition-base)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span style={{ fontSize: '14px' }}>{currentTheme?.icon}</span>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '160px',
                padding: '6px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
              }}
            >
              {themes.map((t) => (
                <motion.button
                  key={t.value}
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: theme === t.value ? 'var(--color-accent-muted)' : 'transparent',
                    border: 'none',
                    color: theme === t.value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: theme === t.value ? 600 : 400,
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {theme === t.value && (
                    <motion.svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ marginLeft: 'auto' }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </motion.svg>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all var(--transition-base)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span style={{ fontSize: '14px' }}>{currentTheme?.icon}</span>
        <span>Theme</span>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: isOpen ? 180 : 0 }}
          style={{ marginLeft: '4px', opacity: 0.6 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: '160px',
              padding: '6px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
            }}
          >
            {themes.map((t) => (
              <motion.button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setIsOpen(false);
                }}
                whileHover={{ scale: 1.02 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: theme === t.value ? 'var(--color-accent-muted)' : 'transparent',
                  border: 'none',
                  color: theme === t.value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: theme === t.value ? 600 : 400,
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
                {theme === t.value && (
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ marginLeft: 'auto' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThemeToggle;
