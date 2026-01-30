import { X, Shield, AlertTriangle, ExternalLink } from 'lucide-react';

interface PoHVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

export function PoHVerificationModal({ isOpen, onClose, walletAddress }: PoHVerificationModalProps) {
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
          maxWidth: '480px',
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
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Shield size={20} color="white" />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Not PoH Verified
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

        {/* Warning Banner */}
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#ef4444' }}>
              Wallet Not Verified
            </p>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Your wallet needs to be Proof of Humanity (PoH) verified to use FundTracer features.
            </p>
          </div>
        </div>

        {/* Wallet Info */}
        {walletAddress && (
          <div style={{
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Wallet: </span>
            <span style={{ color: 'var(--color-text-primary)' }}>
              {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
            </span>
          </div>
        )}

        {/* Content */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
            What is Proof of Humanity?
          </h4>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            marginBottom: '16px',
            lineHeight: 1.6,
            fontSize: '14px'
          }}>
            Proof of Humanity (PoH) verification ensures that each user is a unique human being, 
            preventing bots and Sybil attacks. FundTracer requires this to maintain data integrity 
            and fair usage limits.
          </p>

          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
            How to Get Verified
          </h4>
          <ol style={{ 
            color: 'var(--color-text-secondary)',
            paddingLeft: '20px',
            margin: '0',
            fontSize: '14px',
            lineHeight: 1.6
          }}>
            <li>Visit the Linea Exponent platform</li>
            <li>Connect your wallet ({walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : 'your wallet'})</li>
            <li>Complete the human verification process</li>
            <li>Return to FundTracer and reconnect your wallet</li>
          </ol>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="https://linea.exponent"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Get Verified on Linea
            <ExternalLink size={16} />
          </a>
          
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
