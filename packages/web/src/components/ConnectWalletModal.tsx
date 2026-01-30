import { X, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WalletButton } from './WalletButton';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

export function ConnectWalletModal({ isOpen, onClose, actionName = 'perform this action' }: ConnectWalletModalProps) {
  const { user } = useAuth();

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
          maxWidth: '420px',
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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Wallet size={20} color="white" />
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
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--color-text-muted)',
            }}
          >
            <X size={24} />
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
              <p style={{ margin: 0, fontSize: '14px', color: '#60a5fa' }}>
                Signed in as: <strong>{user.email}</strong>
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
