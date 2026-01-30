import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PoHVerificationModal } from './PoHVerificationModal';

interface PoHGuardProps {
  children: React.ReactNode;
  onAttempt?: () => void;
}

export function PoHGuard({ children, onAttempt }: PoHGuardProps) {
  const { profile, wallet } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const isVerified = profile?.isVerified || false;
  const walletAddress = wallet?.address;

  const handleClick = (e: React.MouseEvent) => {
    if (!isVerified) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[PoHGuard] Wallet not PoH verified, showing modal');
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
      <PoHVerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        walletAddress={walletAddress}
      />
    </>
  );
}
