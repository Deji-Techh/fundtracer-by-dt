import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ConnectWalletModal } from './ConnectWalletModal';

interface WalletGuardProps {
  children: React.ReactNode;
  actionName?: string;
  onAttempt?: () => void;
}

export function WalletGuard({ children, actionName = 'perform this action', onAttempt }: WalletGuardProps) {
  const { isWalletConnected } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isWalletConnected) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[WalletGuard] Wallet not connected, showing modal');
      setShowModal(true);
      onAttempt?.();
      return false;
    }
  };

  return (
    <>
      <div onClickCapture={handleClick} style={{ display: 'contents' }}>
        {children}
      </div>
      <ConnectWalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        actionName={actionName}
      />
    </>
  );
}
