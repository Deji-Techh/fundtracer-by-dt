import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  GasPipeIcon,
  Cancel01Icon,
  Loading01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
} from '@hugeicons/core-free-icons';
import { sendGasPayment, verifyGasPayment } from '../../services/paymentVerification.js';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/ToastContext';

const GAS_PAYMENT_ADDRESS = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
const LINEA_CHAIN_ID = 59144;

export function GasPaymentModal({ isOpen, onClose, onPaymentSuccess, onCancel }) {
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { wallet } = useAuth();
  const notify = useNotify();

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(GAS_PAYMENT_ADDRESS);
      setCopied(true);
      notify.success('Gas payment address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notify.error('Failed to copy address');
    }
  };

  const handleSendGas = async () => {
    if (!wallet?.address) {
      notify.error('Please connect your wallet first');
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const result = await sendGasPayment(wallet.address);
      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        notify.success('Gas transaction sent! Waiting for confirmation...');

        setTimeout(async () => {
          setVerifying(true);
          const verification = await verifyGasPayment(wallet.address);
          if (verification.verified) {
            setVerifying(false);
            notify.success('Gas payment verified!');
            setTimeout(() => {
              onPaymentSuccess(result.txHash);
            }, 1000);
          } else {
            setVerifying(false);
            setError('Payment verification failed. Please contact support.');
          }
        }, 5000);
      } else {
        setError(result.error || 'Failed to send gas payment');
        setPaying(false);
      }
    } catch (err) {
      console.error('[GasPayment] Error:', err);
      setError(err.message || 'Failed to send gas payment');
      setPaying(false);
    }
  };

  const handleClose = () => {
    setPaying(false);
    setVerifying(false);
    setTxHash(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              Gas Payment Required
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <HugeiconsIcon icon={GasPipeIcon} size={32} color="#ea580c" strokeWidth={2} />
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', margin: '0 0 4px' }}>
                  Free Tier Limit Reached
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                  You've used your 7 daily operations. Send a small gas payment (0.0001 ETH) to continue.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#0f0f0f',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '16px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', display: 'block' }}>
                  GAS PAYMENT ADDRESS
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '4px',
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: '#ffffff',
                      wordBreak: 'break-all',
                    }}
                  >
                    {GAS_PAYMENT_ADDRESS}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    style={{
                      padding: '8px',
                      backgroundColor: '#2a2a2a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: copied ? '#22c55e' : '#9ca3af',
                    }}
                  >
                    <HugeiconsIcon
                      icon={copied ? CheckmarkCircle02Icon : require('@hugeicons/core-free-icons').Copy01Icon}
                      size={16}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px' }}>
                <HugeiconsIcon icon={Alert01Icon} size={16} color="#ea580c" strokeWidth={2} />
                <span>Amount: 0.0001 ETH (~$0.30)</span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(234, 88, 12, 0.1)',
                  border: '1px solid #ea580c',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#ea580c',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            {txHash && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid #22c55e',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#22c55e',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <HugeiconsIcon icon={Loading01Icon} size={16} strokeWidth={2} className="animate-spin" />
                  <span>Verifying payment on blockchain...</span>
                </div>
                {verifying && (
                  <div style={{ marginTop: '8px' }}>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      TX: {txHash.substring(0, 20)}...
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleClose}
              disabled={paying || verifying}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: paying || verifying ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendGas}
              disabled={paying || verifying}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: paying || verifying ? '#6b7280' : '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: paying || verifying ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {paying ? (
                <>
                  <HugeiconsIcon icon={Loading01Icon} size={18} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={GasPipeIcon} size={18} />
                  Pay Gas (0.0001 ETH)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
