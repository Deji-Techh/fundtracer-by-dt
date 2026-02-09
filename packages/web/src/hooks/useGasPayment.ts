import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/ToastContext';
// @ts-ignore - JS modules without type declarations
import {
  canPerformSybilOperation,
  getRemainingOperations,
  incrementSybilUsage,
} from '../lib/sybilTier.js';

// Constants
export const TARGET_WALLET = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
export const LINEA_CHAIN_ID = 59144;
export const GAS_AMOUNT_ETH = '0.0001';

interface UseGasPaymentReturn {
  /** Whether the gas payment modal should be shown */
  showGasPaymentModal: boolean;
  /** Whether the upgrade modal should be shown */
  showUpgradeModal: boolean;
  /** Current tier */
  currentTier: 'free' | 'pro' | 'max';
  /** Open the gas payment modal */
  openGasModal: () => void;
  /** Close the gas payment modal */
  closeGasModal: () => void;
  /** Open the upgrade modal */
  openUpgradeModal: () => void;
  /** Close the upgrade modal */
  closeUpgradeModal: () => void;
  /** Set current tier (e.g. after upgrade) */
  setCurrentTier: (tier: 'free' | 'pro' | 'max') => void;
  /**
   * Gate an operation behind tier/usage checks.
   * Returns true if the operation can proceed, false if blocked (modal shown).
   * Caller should only continue with the operation if this returns true.
   */
  gateOperation: () => boolean;
  /**
   * Call after a successful operation to increment the usage counter.
   */
  recordUsage: () => void;
  /**
   * Handle gas payment success callback — closes modal, shows toast.
   */
  handleGasPaymentSuccess: (txHash: string) => void;
}

export function useGasPayment(): UseGasPaymentReturn {
  const { profile } = useAuth();
  const notify = useNotify();

  const [showGasPaymentModal, setShowGasPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentTier, setCurrentTier] = useState<'free' | 'pro' | 'max'>(
    () => profile?.tier || 'free'
  );

  // Sync tier from profile when it changes
  // (Caller can also use the returned setCurrentTier for manual overrides)

  const openGasModal = useCallback(() => setShowGasPaymentModal(true), []);
  const closeGasModal = useCallback(() => setShowGasPaymentModal(false), []);
  const openUpgradeModal = useCallback(() => setShowUpgradeModal(true), []);
  const closeUpgradeModal = useCallback(() => setShowUpgradeModal(false), []);

  const gateOperation = useCallback((): boolean => {
    if (!canPerformSybilOperation(currentTier)) {
      const remaining = getRemainingOperations(currentTier);
      if (currentTier === 'free' && remaining === 0) {
        // Free tier exhausted — show gas payment modal
        setShowGasPaymentModal(true);
        return false;
      }
      // Paid tier exhausted — show upgrade modal
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [currentTier]);

  const recordUsage = useCallback(() => {
    incrementSybilUsage();
  }, []);

  const handleGasPaymentSuccess = useCallback((txHash: string) => {
    setShowGasPaymentModal(false);
    notify.success('Gas payment verified! You can now proceed.');
  }, [notify]);

  return {
    showGasPaymentModal,
    showUpgradeModal,
    currentTier,
    openGasModal,
    closeGasModal,
    openUpgradeModal,
    closeUpgradeModal,
    setCurrentTier,
    gateOperation,
    recordUsage,
    handleGasPaymentSuccess,
  };
}
