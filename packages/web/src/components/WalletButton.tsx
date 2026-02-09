import { useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { useIsMobile } from '../hooks/useIsMobile';

export function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { wallet, unlinkWallet } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const isMobile = useIsMobile();

  const handleConnect = () => {
    console.log('[WalletButton] Opening AppKit modal...');
    open();
  };

  const handleDisconnectClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDisconnect = async () => {
    console.log('[WalletButton] Disconnecting wallet...');
    await unlinkWallet();
    setShowConfirm(false);
  };

  const isWalletConnected = isConnected || !!wallet?.address;
  const displayAddress = address || wallet?.address;

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <>
      {isWalletConnected && displayAddress ? (
        <button
          className="connect-btn connected"
          onClick={handleDisconnectClick}
          title="Disconnect wallet"
        >
          <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
          <span>{formatAddress(displayAddress)}</span>
        </button>
      ) : (
        <button
          className="connect-btn"
          onClick={handleConnect}
          title="Connect wallet"
        >
          <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
          <span>Connect Wallet</span>
        </button>
      )}

      {/* Disconnect Confirmation Modal */}
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
                <AlertCircle size={24} color="var(--color-danger, #ef4444)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                Disconnect Wallet?
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                Are you sure you want to disconnect your wallet? You'll need to reconnect it to perform analyses.
              </p>
              <p style={{ color: 'var(--color-success, #10b981)', fontSize: '13px', marginTop: '12px', padding: '8px', background: 'color-mix(in srgb, var(--color-success, #10b981) 10%, transparent)', borderRadius: '6px' }}>
                Your premium tier is tied to your account email, not this wallet. You won't lose your tier access.
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
                onClick={handleConfirmDisconnect}
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
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
