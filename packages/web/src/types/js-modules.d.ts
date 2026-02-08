// Type declarations for JavaScript modules without type definitions

declare module './sybil/UpgradeModal.jsx' {
  import React from 'react';
  
  interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    currentTier?: string;
  }
  
  export const UpgradeModal: React.FC<UpgradeModalProps>;
}

declare module './sybil/GasPaymentModal.jsx' {
  import React from 'react';
  
  interface GasPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentComplete: (txHash: string) => void;
    requiredAmount?: number;
  }
  
  export const GasPaymentModal: React.FC<GasPaymentModalProps>;
}

declare module '../lib/sybilTier.js' {
  export interface SybilTier {
    name: string;
    dailyLimit: number;
    features: string[];
  }
  
  export const SYBIL_TIERS: Record<string, SybilTier>;
  
  export function getSybilUsage(): { count: number; lastReset: number };
  export function canPerformSybilOperation(): boolean;
  export function getRemainingOperations(): number;
  export function incrementSybilUsage(): void;
  export function storePaymentVerification(tier: string, txHash: string): void;
  export function getStoredPaymentVerification(): { tier: string; txHash: string; timestamp: number } | null;
  export function clearPaymentVerification(): void;
}

declare module '../services/paymentVerification.js' {
  export function verifySubscriptionPayment(
    userAddress: string, 
    tier: string, 
    paymentAddress: string
  ): Promise<{ success: boolean; message?: string; error?: string }>;
  
  export function sendGasPayment(
    to: string, 
    amount: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }>;
  
  export function verifyGasPayment(
    txHash: string, 
    expectedAmount: string
  ): Promise<{ success: boolean; verified: boolean; error?: string }>;
}
