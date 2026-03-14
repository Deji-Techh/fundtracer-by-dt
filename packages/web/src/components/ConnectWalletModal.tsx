import { HugeiconsIcon } from '@hugeicons/react';
import { CloseIcon, Wallet01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { WalletButton } from './WalletButton';
import { useIsMobile } from '../hooks/useIsMobile';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

export function ConnectWalletModal({ isOpen, onClose, actionName = 'perform this action' }: ConnectWalletModalProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!isOpen) return null;

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
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
        padding: isMobile ? 0 : undefined,
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: isMobile ? '16px 16px 0 0' : '12px',
          padding: isMobile ? '24px' : '32px',
          maxWidth: isMobile ? '100%' : '420px',
          width: isMobile ? '100%' : '90%',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          animation: 'scaleIn 0.3s ease-out',
          maxHeight: isMobile ? '85vh' : undefined,
          overflowY: isMobile ? 'auto' as const : undefined,
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
              background: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={2} color="white" />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Wallet Required
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: '4px',
              color: 'var(--color-text-muted)',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HugeiconsIcon icon={CloseIcon} size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            marginBottom: '16px',
            lineHeight: 1.6 
          }}>
            You need to connect a wallet to <strong>{actionName}</strong>.
          </p>
          
          {user && (
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                Signed in as: <strong>{user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Unknown'}</strong>
              </p>
            </div>
          )}

          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Connecting your wallet allows you to:
          </p>
          <ul style={{ 
            fontSize: '14px', 
            color: 'var(--color-text-muted)',
            paddingLeft: '20px',
            margin: '8px 0 0 0'
          }}>
            <li>Analyze smart contracts</li>
            <li>Compare wallet portfolios</li>
            <li>Access all FundTracer features</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <WalletButton size="lg" />
          
          <button
            onClick={onClose}
            style={{
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              minHeight: 44,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
