import { useState, useCallback } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { HugeiconsIcon } from '@hugeicons/react';
import { LogOut01Icon, AlertCircleIcon, RefreshCw, Wallet01Icon, ArrowRight01Icon, CloseIcon } from '@hugeicons/core-free-icons';
import { useIsMobile } from '../hooks/useIsMobile';

interface WalletButtonProps {
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function WalletButton({ onError, onSuccess }: WalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { wallet, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleConnect = useCallback(async () => {
    setConnectionError(null);
    setIsConnecting(true);
    
    try {
      console.log('[WalletButton] Opening AppKit modal...');
      await open();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setConnectionError(errorMessage);
      onError?.(errorMessage);
      console.error('[WalletButton] Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [open, onError, onSuccess]);

  const getRetryAction = () => {
    setConnectionError(null);
    handleConnect();
  };

  const handleSignOutClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmSignOut = async () => {
    console.log('[WalletButton] Signing out...');
    await signOut();
    setShowConfirm(false);
  };

  const isWalletConnected = isConnected || !!wallet?.address;
  const displayAddress = address || wallet?.address;

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const errorMessages: Record<string, string> = {
    'User rejected': 'Connection was rejected. Please approve the wallet connection.',
    'Already processing': 'A connection request is already pending. Please check your wallet.',
    'The request was rejected': 'Connection was rejected. Please approve the wallet connection.',
    'User closed modal': 'Connection was cancelled. Click retry to try again.',
  };

  const getErrorMessage = (error: string): string => {
    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
    return 'Failed to connect wallet. Please try again or check your wallet extension.';
  };

  return (
    <>
      {connectionError ? (
        <button
          className="connect-btn error"
          onClick={getRetryAction}
          title="Retry connection"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} color="#ef4444" />
          <span>Retry</span>
          <HugeiconsIcon icon={RefreshCw} size={14} strokeWidth={2} />
        </button>
      ) : isWalletConnected && displayAddress ? (
        <button
          className="connect-btn connected"
          onClick={handleSignOutClick}
          title="Sign out"
        >
          <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
          <span>{formatAddress(displayAddress)}</span>
        </button>
      ) : (
        <button
          className="connect-btn"
          onClick={handleConnect}
          disabled={isConnecting}
          title="Connect wallet"
        >
          {isConnecting ? (
            <HugeiconsIcon icon={RefreshCw} size={18} strokeWidth={1.5} className="spin" />
          ) : (
            <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
          )}
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
      )}

      {/* Connection Error Toast */}
      {connectionError && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '360px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <HugeiconsIcon icon={AlertCircleIcon} size={20} strokeWidth={2} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Connection Failed
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                {getErrorMessage(connectionError)}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={getRetryAction}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#3b82f6',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                <HugeiconsIcon icon={RefreshCw} size={14} strokeWidth={2} />
                Try Again
                </button>
                <button
                  onClick={() => setConnectionError(null)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showConfirm && (
        <div
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
            padding: isMobile ? 0 : undefined,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated, var(--color-surface))',
              borderRadius: isMobile ? '16px 16px 0 0' : '12px',
              padding: '24px',
              maxWidth: isMobile ? '100%' : '400px',
              width: isMobile ? '100%' : '90%',
              border: '1px solid var(--color-border)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <HugeiconsIcon icon={LogOut01Icon} size={24} strokeWidth={1.5} color="var(--color-danger, #ef4444)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                Sign Out?
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                This will disconnect your wallet and clear all local data. Your account and history are safely stored on our servers.
              </p>
              <p style={{ color: 'var(--color-warning, #f59e0b)', fontSize: '13px', marginTop: '12px', padding: '8px', background: 'color-mix(in srgb, var(--color-warning, #f59e0b) 10%, transparent)', borderRadius: '6px' }}>
                Your premium tier and history are tied to your wallet address. They will be restored when you sign back in.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-hover, var(--color-bg-elevated))',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-danger, #ef4444)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
