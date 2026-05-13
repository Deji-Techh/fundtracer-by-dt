import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchSetupToastProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const SETUP_URL = 'https://fundtracer.xyz/search?q=%s';

export function SearchSetupToast({ isOpen, onDismiss }: SearchSetupToastProps) {
  const [showDemo, setShowDemo] = useState(false);

  const handleCopySetup = () => {
    const instructions =
`1. Open Chrome Settings → Search Engine → Manage Search Engines
2. Click "Add"
3. Fill in:
   · Name: FundTracer
   · Keyword: ft
   · URL: ${SETUP_URL}
4. Save

Now type "ft" in the address bar, press Tab, paste any wallet address or explorer URL.`;

    navigator.clipboard.writeText(instructions);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            maxWidth: 440,
            width: 'calc(100% - 32px)',
          }}
        >
          <div style={{
            background: 'var(--color-bg-elevated, #151515)',
            border: '1px solid rgba(97, 223, 255, 0.15)',
            borderRadius: 14,
            padding: '16px 18px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(97, 223, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="#61dfff" strokeWidth="1.3">
                  <circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {showDemo ? (
                  <div>
                    <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5 }}>
                      Type <strong style={{ color: '#61dfff' }}>ft</strong> in your address bar, press <kbd style={{
                        background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4,
                        fontSize: '0.75rem', fontFamily: 'inherit'
                      }}>Tab</kbd>, paste any wallet address or explorer URL, then <kbd style={{
                        background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4,
                        fontSize: '0.75rem', fontFamily: 'inherit'
                      }}>Enter</kbd>.
                    </p>
                    <div style={{
                      background: 'rgba(97, 223, 255, 0.04)',
                      border: '1px solid rgba(97, 223, 255, 0.1)',
                      borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                      fontFamily: 'monospace', fontSize: '0.8rem', color: '#888',
                    }}>
                      <span style={{ color: '#61dfff' }}>ft</span>{' '}
                      https://lineascan.build/address/0xf8a3... → auto-analyze
                    </div>
                    <button onClick={() => setShowDemo(false)}
                      style={{
                        background: 'transparent', border: 'none', color: '#888',
                        cursor: 'pointer', fontSize: '0.8rem', padding: 0,
                      }}
                    >← Back</button>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#e0e0e0', lineHeight: 1.4 }}>
                      <strong style={{ color: '#61dfff' }}>Quick tip:</strong> Add FundTracer as a browser search engine for instant wallet lookups.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={handleCopySetup}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: '#61dfff', color: '#0a0a0a', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.8rem',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        Copy Setup
                      </button>
                      <button onClick={() => setShowDemo(true)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'transparent', color: '#aaa', cursor: 'pointer',
                          fontWeight: 500, fontSize: '0.8rem',
                        }}
                      >How it works</button>
                      <button onClick={onDismiss}
                        style={{
                          marginLeft: 'auto', width: 28, height: 28,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', color: '#555',
                          cursor: 'pointer', borderRadius: 6, flexShrink: 0,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
