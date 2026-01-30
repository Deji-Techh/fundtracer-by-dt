import { X, Command, Search, Zap, HelpCircle, CornerDownLeft, AlertCircle } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: '?', description: 'Show keyboard shortcuts', icon: HelpCircle },
    { key: `${modKey} + K`, description: 'Focus search input', icon: Search },
    { key: `${modKey} + Enter`, description: 'Run analysis', icon: Zap },
    { key: 'Esc', description: 'Close modals / Cancel', icon: X },
  ];

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          animation: 'scaleIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Command size={20} color="white" />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--color-text-muted)',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div style={{ display: 'grid', gap: '12px' }}>
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <shortcut.icon size={18} color="var(--color-text-muted)" />
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {shortcut.description}
                </span>
              </div>
              <kbd
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                }}
              >
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} color="#60a5fa" />
          <span style={{ fontSize: '13px', color: '#60a5fa' }}>
            Press <kbd style={{ padding: '2px 4px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '3px', fontFamily: 'monospace' }}>?</kbd> anytime to see this guide
          </span>
        </div>
      </div>
    </div>
  );
}
