import React, { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, CheckmarkCircle01Icon, CloseIcon, ArrowRight01Icon, Trash01Icon } from '@hugeicons/core-free-icons';

interface WalletSelection {
  address: string;
  label?: string;
  selected: boolean;
}

interface BulkWalletSelectorProps {
  wallets: WalletSelection[];
  onChange: (wallets: WalletSelection[]) => void;
  maxSelection?: number;
  className?: string;
}

export function BulkWalletSelector({
  wallets: initialWallets,
  onChange,
  maxSelection = 10,
  className = ''
}: BulkWalletSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const wallets = searchQuery
    ? initialWallets.filter(
        w =>
          w.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.label?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : initialWallets;

  const selectedCount = initialWallets.filter(w => w.selected).length;

  const handleToggle = useCallback((address: string) => {
    const updated = initialWallets.map(w => {
      if (w.address === address) {
        if (w.selected) {
          return { ...w, selected: false };
        }
        if (selectedCount < maxSelection) {
          return { ...w, selected: true };
        }
      }
      return w;
    });
    onChange(updated);
  }, [initialWallets, onChange, selectedCount, maxSelection]);

  const handleSelectAll = useCallback(() => {
    const availableSlots = maxSelection - selectedCount;
    if (availableSlots <= 0) return;

    const updated = initialWallets.map(w => {
      if (!w.selected && availableSlots > 0) {
        return { ...w, selected: true };
      }
      return w;
    });
    onChange(updated);
  }, [initialWallets, onChange, selectedCount, maxSelection]);

  const handleDeselectAll = useCallback(() => {
    onChange(initialWallets.map(w => ({ ...w, selected: false })));
  }, [initialWallets, onChange]);

  return (
    <div className={className} style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={2} color="var(--color-accent)" />
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Select Wallets
          </span>
          <span style={{
            padding: '4px 10px',
            background: selectedCount > 0 ? 'var(--color-accent)' : 'var(--color-bg-subtle)',
            color: selectedCount > 0 ? '#000' : 'var(--color-text-muted)',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            {selectedCount} / {maxSelection}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSelectAll}
            disabled={selectedCount >= maxSelection}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              cursor: selectedCount >= maxSelection ? 'not-allowed' : 'pointer',
              opacity: selectedCount >= maxSelection ? 0.5 : 1,
            }}
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={selectedCount === 0}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedCount === 0 ? 0.5 : 1,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search wallets..."
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
      }}>
        {wallets.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}>
            No wallets found
          </div>
        ) : (
          wallets.map(wallet => (
            <button
              key={wallet.address}
              onClick={() => handleToggle(wallet.address)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: wallet.selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '6px',
                border: wallet.selected 
                  ? 'none' 
                  : '2px solid var(--color-border)',
                background: wallet.selected 
                  ? 'var(--color-accent)' 
                  : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {wallet.selected && (
                  <HugeiconsIcon 
                    icon={CheckmarkCircle01Icon} 
                    size={14} 
                    strokeWidth={3} 
                    color="#000" 
                  />
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {wallet.label || `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'monospace',
                }}>
                  {wallet.address}
                </div>
              </div>

              {wallet.selected && (
                <HugeiconsIcon 
                  icon={ArrowRight01Icon} 
                  size={16} 
                  strokeWidth={2} 
                  color="var(--color-accent)" 
                />
              )}
            </button>
          ))
        )}
      </div>

      {selectedCount > 0 && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: '12px',
        }}>
          <button
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Analyze {selectedCount} Wallets
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkWalletSelector;
