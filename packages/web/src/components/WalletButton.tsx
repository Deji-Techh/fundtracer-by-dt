import { useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { useIsMobile } from '../hooks/useIsMobile';

export function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { wallet, signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const isMobile = useIsMobile();

  const handleConnect = () => {
    console.log('[WalletButton] Opening AppKit modal...');
    open();
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

  return (
    <>
      {isWalletConnected && displayAddress ? (
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
          title="Connect wallet"
        >
          <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
          <span>Connect Wallet</span>
        </button>
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
                <LogOut size={24} color="var(--color-danger, #ef4444)" />
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
