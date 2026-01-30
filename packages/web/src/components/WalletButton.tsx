import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Unlink } from 'lucide-react';

export function WalletButton() {
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

  if (isWalletConnected && displayAddress) {
    // Connected state - use existing btn classes
    return (
      <button
        onClick={handleDisconnect}
        className="btn btn-ghost"
        title="Disconnect wallet"
      >
        <Unlink size={16} />
        <span style={{ marginLeft: '6px' }}>{displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}</span>
      </button>
    );
  }

  // Disconnected state - use existing btn classes
  return (
    <button
      onClick={handleConnect}
      className="btn btn-primary"
      title="Connect wallet"
    >
      <Wallet size={16} />
      <span style={{ marginLeft: '6px' }}>Connect Wallet</span>
    </button>
  );
}
