import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
  Cancel01Icon,
  Loading01Icon,
} from '@hugeicons/core-free-icons';
import { SYBIL_TIERS } from '../../lib/sybilTier.js';
import { verifySubscriptionPayment } from '../../services/paymentVerification.js';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export function UpgradeModal({ isOpen, onClose, currentTier, walletAddress, onUpgradeComplete }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const notify = useNotify();
  const isMobile = useIsMobile();

  const paymentAddress = selectedTier ? SYBIL_TIERS[selectedTier].paymentAddress : '';

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(paymentAddress);
      setCopied(true);
      notify.success('Payment address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notify.error('Failed to copy address');
    }
  };

  const handleUpgradeClick = (tierId) => {
    if (tierId === currentTier) return;
    setSelectedTier(tierId);
    setShowPayment(true);
  };

  const handleVerifyPayment = async () => {
    if (!selectedTier || selectedTier === 'free') return;
    if (!walletAddress) {
      notify.error('Please connect your wallet first');
      return;
    }

    setVerifying(true);
    try {
      const result = await verifySubscriptionPayment(walletAddress, selectedTier);
      if (result.verified) {
        setPaymentVerified(true);
        notify.success('Payment verified! Upgrading your tier...');
        setTimeout(() => {
          onUpgradeComplete(selectedTier);
          handleClose();
        }, 2000);
      } else {
        notify.error('Payment not found. Please check your transaction.');
      }
    } catch (error) {
      notify.error('Failed to verify payment. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setSelectedTier(null);
    setShowPayment(false);
    setPaymentVerified(false);
    setVerifying(false);
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
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobile ? 0 : undefined,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: isMobile ? '16px 16px 0 0' : '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: isMobile ? '100%' : (showPayment ? '500px' : '900px'),
          width: isMobile ? '100%' : '90%',
          maxHeight: isMobile ? '90vh' : '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--color-text-primary)', fontSize: isMobile ? '20px' : '24px', fontWeight: '700', margin: 0 }}>
              {showPayment ? 'Complete Your Upgrade' : 'Choose Your Plan'}
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '10px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--color-text-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--color-text-secondary)'}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={2} />
            </button>
          </div>

          {!showPayment ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {Object.entries(SYBIL_TIERS).map(([tierId, tier]) => {
                const isCurrent = tierId === currentTier;
                const isUpgradeSelected = selectedTier === tierId;

                return (
                  <div
                    key={tierId}
                    onClick={() => handleUpgradeClick(tierId)}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: isUpgradeSelected
                        ? tier.color
                        : isCurrent
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backgroundColor: tier.bgColor,
                      cursor: isCurrent ? 'default' : 'pointer',
                      transition: 'all 0.3s',
                      position: 'relative',
                    }}
                    >
                    {isCurrent && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          backgroundColor: tier.color,
                          color: 'var(--color-text-primary)',
                          fontSize: '12px',
                          fontWeight: '600',
                      >
                        Current
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                        {tier.name}
                      </h3>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
                        {tier.price > 0 && `$${tier.price}/month`}
                      </div>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {tier.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#e5e7eb',
                            fontSize: '14px',
                            marginBottom: '8px',
                          }}
                        >
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} color={tier.color} strokeWidth={2} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {!isCurrent && (
                      <button
                        onClick={() => handleUpgradeClick(tierId)}
                        style={{
                          width: '100%',
                          marginTop: '20px',
                          padding: '12px',
                          backgroundColor: tier.color,
                          color: 'var(--color-text-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          minHeight: 44,
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '0.9';
                          e.target.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '1';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        {tier.price === 0 ? 'Get Started' : `Upgrade to ${tier.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: '600', margin: '0 0 8px' }}>
                  Send {selectedTier && SYBIL_TIERS[selectedTier]?.price} ETH
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
                  to upgrade to <strong>{selectedTier && SYBIL_TIERS[selectedTier]?.name}</strong>
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <label style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                  PAYMENT ADDRESS
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
          backgroundColor: 'var(--color-bg-elevated)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                      wordBreak: 'break-all',
                    }}
                  >
                    {paymentAddress}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--color-border)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: copied ? 'var(--color-positive)' : 'var(--color-text-secondary)',
                      transition: 'color 0.2s',
                    }}
                  >
                    <HugeiconsIcon
                      icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
                      size={18}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--color-border-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--color-border)';
                  }}
                >
                  Go Back
                </button>
                <button
                  onClick={handleVerifyPayment}
                  disabled={verifying || paymentVerified}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: paymentVerified ? 'var(--color-positive)' : (selectedTier && SYBIL_TIERS[selectedTier]?.color || 'var(--color-accent)'),
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => {
                    if (!paymentVerified) {
                      e.target.style.opacity = '0.9';
                      e.target.style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!paymentVerified) {
                      e.target.style.opacity = '1';
                      e.target.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {verifying ? (
                    <>
                      <HugeiconsIcon icon={Loading01Icon} size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : paymentVerified ? (
                    <>
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
                      I've Paid
                    </>
                  ) : (
                    <>
                      I've Paid
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
