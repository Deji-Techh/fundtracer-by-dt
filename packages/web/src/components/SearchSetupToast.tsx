import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchSetupToastProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const SETUP_URL = 'https://fundtracer.xyz/search?q=%s';

export function SearchSetupToast({ isOpen, onDismiss }: SearchSetupToastProps) {
  const [showDemo, setShowDemo] = useState(false);
  const [setupState, setSetupState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (isOpen) {
      setSetupState('idle');
      setShowDemo(false);
    }
  }, [isOpen]);

  const handleSetup = () => {
    navigator.clipboard.writeText(SETUP_URL);
    setSetupState('copied');
    window.open('chrome://settings/searchEngines', '_blank');
    // Also try edge:// for Edge users
    setTimeout(() => window.open('edge://settings/searchEngines', '_blank'), 200);
  };

  const handleDismiss = () => {
    setSetupState('idle');
    setShowDemo(false);
    onDismiss();
  };

  const isDone = setupState === 'copied';

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
            maxWidth: 460,
            width: 'calc(100% - 32px)',
          }}
        >
          <div style={{
            background: '#1a1a1a',
            border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(97, 223, 255, 0.15)'}`,
            borderRadius: 14,
            padding: '16px 18px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(97, 223, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {isDone ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="#61dfff" strokeWidth="1.3">
                    <circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/>
                  </svg>
                )}
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
                    <p style={{ margin: 0, fontSize: '0.85rem', color: isDone ? '#10b981' : '#e0e0e0', lineHeight: 1.4 }}>
                      {isDone
                        ? 'URL copied! Chrome settings opened. Click "Add", paste the URL, set keyword to ft — done in 10 seconds.'
                        : <><strong style={{ color: '#61dfff' }}>Quick tip:</strong> Add FundTracer as a browser search engine for instant wallet lookups.</>
                      }
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {isDone ? (
                        <button onClick={handleDismiss}
                          style={{
                            padding: '6px 18px', borderRadius: 8, border: 'none',
                            background: '#10b981', color: '#fff', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.8rem',
                          }}
                        >Got it</button>
                      ) : (
                        <>
                          <button onClick={handleSetup}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', borderRadius: 8, border: 'none',
                              background: '#61dfff', color: '#0a0a0a', cursor: 'pointer',
                              fontWeight: 600, fontSize: '0.8rem',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            Set Up in Chrome
                          </button>
                          <button onClick={() => setShowDemo(true)}
                            style={{
                              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                              background: 'transparent', color: '#aaa', cursor: 'pointer',
                              fontWeight: 500, fontSize: '0.8rem',
                            }}
                          >How it works</button>
                        </>
                      )}
                      <button onClick={handleDismiss}
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
