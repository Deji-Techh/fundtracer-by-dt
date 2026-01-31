import { useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Unlink, AlertCircle } from 'lucide-react';

export function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { wallet, unlinkWallet } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

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

  return (
    <>
      {isWalletConnected && displayAddress ? (
        // Connected state - match upgrade-btn size
        <button
          onClick={handleDisconnectClick}
          className="btn btn-ghost"
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}
          title="Disconnect wallet"
        >
          <Unlink size={14} />
          <span>{displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}</span>
        </button>
      ) : (
        // Disconnected state - match upgrade-btn size
        <button
          onClick={handleConnect}
          className="btn btn-primary"
          style={{
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)'
          }}
          title="Connect wallet"
        >
          <Wallet size={14} />
          <span>Connect</span>
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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
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
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertCircle size={24} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                Disconnect Wallet?
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                Are you sure you want to disconnect your wallet? You'll need to reconnect it to perform analyses.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisconnect}
                className="btn btn-primary"
                style={{ 
                  flex: 1,
                  background: '#EF4444',
                  borderColor: '#EF4444'
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
