import React, { useState, useEffect, useRef } from 'react';
import { getLabel, setLabel } from '../utils/addressBook';
import { Tag, Edit2, Check, X, Shield, Database, Repeat, Shuffle, Landmark, Package, AlertTriangle } from 'lucide-react';

export interface EntityInfo {
  address: string;
  name: string;
  category: string;
  chain: string;
  confidence: number;
  source: string;
  verified: boolean;
  tags: string[];
  description?: string;
}

interface AddressLabelProps {
    address: string;
    chain?: string;
    editable?: boolean;
    showAddress?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

// Entity category colors (matches FundingTree entity colors)
const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; label: string; icon: React.ReactNode }> = {
  cex:  { bg: '#1a1508', border: '#f59e0b', text: '#fbbf24', label: 'CEX', icon: <Landmark size={10} /> },
  dex:  { bg: '#140a1a', border: '#9966ff', text: '#b388ff', label: 'DEX', icon: <Repeat size={10} /> },
  bridge:  { bg: '#08151a', border: '#00d4ff', text: '#66e0ff', label: 'Bridge', icon: <Shuffle size={10} /> },
  mixer: { bg: '#1a0808', border: '#ff3366', text: '#ff6688', label: 'Mixer', icon: <Shield size={10} /> },
  lending: { bg: '#0a1a14', border: '#00ff88', text: '#66ffaa', label: 'Lending', icon: <Database size={10} /> },
  liquid_staking: { bg: '#0f1a0a', border: '#80ff00', text: '#b3ff66', label: 'Liquid Staking', icon: <Package size={10} /> },
  nft_marketplace: { bg: '#1a0a14', border: '#ff66cc', text: '#ff99dd', label: 'NFT', icon: <Package size={10} /> },
  mev_bot: { bg: '#1a0a0a', border: '#ff4444', text: '#ff7777', label: 'MEV Bot', icon: <AlertTriangle size={10} /> },
  known_scammer: { bg: '#1a0000', border: '#ff0000', text: '#ff4444', label: 'Scam', icon: <AlertTriangle size={10} /> },
  protocol: { bg: '#0a0a1a', border: '#4488ff', text: '#77aaff', label: 'Protocol', icon: <Database size={10} /> },
  dao_treasury: { bg: '#0a1a1a', border: '#00ffff', text: '#66ffff', label: 'DAO', icon: <Shield size={10} /> },
  oracle: { bg: '#1a1a0a', border: '#ffff00', text: '#ffff66', label: 'Oracle', icon: <Database size={10} /> },
  perpetuals: { bg: '#1a0d0a', border: '#ff8800', text: '#ffaa44', label: 'Perps', icon: <Repeat size={10} /> },
  defi_aggregator: { bg: '#0d0a1a', border: '#aa66ff', text: '#cc88ff', label: 'Aggregator', icon: <Repeat size={10} /> },
  yield: { bg: '#0a1a0d', border: '#44ff88', text: '#77ffaa', label: 'Yield', icon: <Database size={10} /> },
  wallet_infra: { bg: '#0a0d1a', border: '#6688ff', text: '#88aaff', label: 'Wallet Infra', icon: <Shield size={10} /> },
};

// Light mode variants
const CATEGORY_STYLES_LIGHT: Record<string, { bg: string; border: string; text: string }> = {
  cex:  { bg: '#fef7ed', border: '#f59e0b', text: '#92400e' },
  dex:  { bg: '#f3edff', border: '#7c3aed', text: '#5b21b6' },
  bridge:  { bg: '#e6f9ff', border: '#00b3d9', text: '#0077b3' },
  mixer: { bg: '#ffebef', border: '#dc2626', text: '#991b1b' },
  lending: { bg: '#e6fff2', border: '#00cc6e', text: '#008f4d' },
  known_scammer: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  protocol: { bg: '#eef2ff', border: '#4f46e5', text: '#3730a3' },
};

function AddressLabel({ address, chain = 'ethereum', editable = false, showAddress = false, className, style }: AddressLabelProps) {
    const [label, setLabelState] = useState<string | undefined>(undefined);
    const [entity, setEntity] = useState<EntityInfo | null>(null);
    const [entityLoading, setEntityLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const updateLabel = () => {
        setLabelState(getLabel(address));
    };

    // Fetch entity from server
    useEffect(() => {
      // Skip entity lookup for Solana — the backend only has ~50 curated
      // Solana entities, so most lookups 404. The SolanaView already handles
      // its own entity labeling for known programs internally.
      if (!address || chain === 'solana') return;
      setEntityLoading(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      fetch(`/api/entities/${encodeURIComponent(address)}?chain=${chain}`, {
        signal: controller.signal,
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.found) {
            setEntity(data.entity);
          }
        })
        .catch(() => {})
        .finally(() => {
          setEntityLoading(false);
          clearTimeout(timeout);
        });

      return () => {
        controller.abort();
        clearTimeout(timeout);
      };
    }, [address, chain]);

    useEffect(() => {
        updateLabel();
        window.addEventListener('addressBookChanged', updateLabel);
        return () => window.removeEventListener('addressBookChanged', updateLabel);
    }, [address]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        setLabel(address, editValue);
        setIsEditing(false);
    };

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditValue(label || '');
        setIsEditing(true);
    };

    const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    // User label overrides entity
    const displayLabel = label || entity?.name;
    const entityStyle = entity ? (CATEGORY_STYLES[entity.category] || CATEGORY_STYLES.protocol) : null;
    const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
    const lightStyle = entity ? (CATEGORY_STYLES_LIGHT[entity.category] || CATEGORY_STYLES_LIGHT.protocol) : null;

    if (isEditing) {
        return (
            <form onSubmit={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Set label..."
                    style={{
                        padding: '2px 6px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-primary)',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)',
                        width: '140px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <button type="submit" style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-success-text)' }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                    <Check size={14} />
                </button>
                <button type="button" style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}>
                    <X size={14} />
                </button>
            </form>
        );
    }

    // Entity badge (when no user label exists but entity is found)
    if (!label && entity && entityStyle) {
      const colors = isLight && lightStyle ? lightStyle : entityStyle;
      return (
        <span
          className={className}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}
          title={`${entity.name}\n${entity.description || ''}\nChain: ${entity.chain} | Confidence: ${Math.round(entity.confidence * 100)}%\nTags: ${entity.tags.join(', ')}`}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            background: (colors as any).bg,
            border: `1px solid ${(colors as any).border}`,
            color: (colors as any).text,
            cursor: 'default',
          }}>
            {entityStyle.icon}
            {entity.name}
            {entity.verified && (
              <span style={{ fontSize: '9px', opacity: 0.7 }} title="Verified">✓</span>
            )}
          </span>
          {showAddress && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>({formattedAddress})</span>}
        </span>
      );
    }

    // User label display
    const displayContent = label ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
                color: 'var(--color-primary-text)',
                fontWeight: 500,
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '0 4px',
                borderRadius: '4px'
            }}>
                {label}
            </span>
            {showAddress && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>({formattedAddress})</span>}
        </span>
    ) : (
        <span>{formattedAddress}</span>
    );

    return (
        <span
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}
            title={address}
        >
            {displayContent}
            {editable && (
                <button
                    onClick={startEditing}
                    style={{
                        opacity: 0.5,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title={label ? "Edit label" : "Add label"}
                >
                    {label ? <Edit2 size={12} /> : <Tag size={12} />}
                </button>
            )}
        </span>
    );
}

export default AddressLabel;
