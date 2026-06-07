import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { SYBIL_TIERS } from '../../lib/sybilTier.js';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export function UpgradeModal({ isOpen, onClose, currentTier, onUpgradeComplete }) {
  const notify = useNotify();
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handlePlanClick = (tierId) => {
    if (tierId === currentTier) return;

    if (tierId === 'free') {
      onUpgradeComplete?.('free');
      onClose();
      return;
    }

    notify.info('Premium upgrades are completed through secure checkout.');
    window.location.href = '/pricing';
  };

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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: isMobile ? '16px 16px 0 0' : '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: isMobile ? '100%' : '900px',
          width: isMobile ? '100%' : '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ color: 'var(--color-text-primary)', fontSize: isMobile ? '20px' : '24px', fontWeight: '700', margin: 0 }}>
                Choose Your Plan
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '6px 0 0' }}>
                Paid upgrades use secure checkout and activate after payment confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={2} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
            {Object.entries(SYBIL_TIERS).map(([tierId, tier]) => {
              const isCurrent = tierId === currentTier;
              const isPaid = tierId !== 'free';

              return (
                <div
                  key={tierId}
                  style={{
                    backgroundColor: isCurrent ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg)',
                    border: `2px solid ${isCurrent ? 'var(--color-positive)' : (tier.color || 'rgba(255, 255, 255, 0.1)')}`,
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative',
                  }}
                >
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '-10px', right: '16px', backgroundColor: 'var(--color-positive)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                      CURRENT
                    </div>
                  )}

                  <h3 style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>
                    {tier.name}
                  </h3>
                  <div style={{ color: tier.color, fontSize: '28px', fontWeight: '800', marginBottom: '16px' }}>
                    {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
                  </div>

                  <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                    {(tier.benefits || []).map((feature) => (
                      <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} color="var(--color-positive)" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlanClick(tierId)}
                    disabled={isCurrent}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: isCurrent ? 'var(--color-bg-muted)' : (tier.color || 'var(--color-accent)'),
                      color: 'var(--color-text-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: isCurrent ? 'not-allowed' : 'pointer',
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: isCurrent ? 0.7 : 1,
                    }}
                  >
                    {isCurrent ? 'Current Plan' : isPaid ? `Upgrade to ${tier.name}` : 'Use Free'}
                    {!isCurrent && isPaid && <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
