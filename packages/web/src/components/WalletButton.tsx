import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Unlink } from 'lucide-react';

interface WalletButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function WalletButton({ size = 'md', showIcon = true }: WalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { wallet, unlinkWallet } = useAuth();

  const handleConnect = () => {
    console.log('[WalletButton] Opening AppKit modal...');
    open();
  };

  const handleDisconnect = async () => {
    console.log('[WalletButton] Disconnecting wallet...');
    await unlinkWallet();
  };

  const isWalletConnected = isConnected || !!wallet?.address;
  const displayAddress = address || wallet?.address;

  // Size configurations
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px', iconSize: 14 },
    md: { padding: '10px 16px', fontSize: '14px', iconSize: 16 },
    lg: { padding: '12px 20px', fontSize: '16px', iconSize: 18 }
  };

  const currentSize = sizes[size];

  if (isWalletConnected && displayAddress) {
    // Connected state - Red disconnect button
    return (
      <button
        onClick={handleDisconnect}
        className="wallet-btn wallet-btn-disconnect"
        style={{
          padding: currentSize.padding,
          fontSize: currentSize.fontSize,
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
        }}
      >
        {showIcon && <Unlink size={currentSize.iconSize} />}
        <span>Disconnect {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}</span>
      </button>
    );
  }

  // Disconnected state - Animated gradient connect button
  return (
    <button
      onClick={handleConnect}
      className="wallet-btn wallet-btn-connect"
      style={{
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)',
        backgroundSize: '200% 200%',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        animation: 'gradientShift 3s ease infinite, pulse 2s ease-in-out infinite',
        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(22, 163, 74, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.3)';
      }}
    >
      {showIcon && <Wallet size={currentSize.iconSize} />}
      <span>Connect Wallet</span>
    </button>
  );
}
