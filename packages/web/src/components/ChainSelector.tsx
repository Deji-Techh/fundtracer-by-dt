import React from 'react';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

interface ChainSelectorProps {
    selectedChain: ChainId;
    onSelect: (chainId: ChainId) => void;
    onUpgrade: () => void;
}

function ChainSelector({ selectedChain, onSelect, onUpgrade }: ChainSelectorProps) {
    const { profile } = useAuth();
    const chains = Object.values(CHAINS);
    const tier = (profile?.tier || 'free').toLowerCase();

    const isChainAllowed = (chainId: ChainId) => {
        if (tier === 'max') return true;
        if (tier === 'pro') return ['linea', 'arbitrum', 'base'].includes(chainId);
        return chainId === 'linea';
    };

    return (
        <>
            {/* Desktop View - Original flex layout */}
            <div className="chain-selector desktop-only">
                {chains.map((chain) => {
                    const allowed = isChainAllowed(chain.id);
                    return (
                        <button
                            key={chain.id}
                            className={`chain-btn ${selectedChain === chain.id ? 'active' : ''} ${!chain.enabled ? 'disabled' : ''}`}
                            onClick={() => allowed ? onSelect(chain.id) : onUpgrade()}
                            style={!allowed ? { opacity: 0.7 } : {}}
                        >
                            <span className="chain-dot" style={{ background: allowed ? undefined : 'var(--color-text-muted)' }} />
                            {chain.name}
                            {!allowed && (
                                <span style={{
                                    marginLeft: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    color: 'var(--color-primary)',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>
                                    <Lock size={10} />
                                    {tier === 'free' ? 'PRO' : 'MAX'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Mobile View - Grid layout with corner badges */}
            <div className="chain-selector-mobile mobile-only">
                {chains.map((chain) => {
                    const allowed = isChainAllowed(chain.id);
                    return (
                        <button
                            key={chain.id}
                            className={`chain-btn-mobile ${selectedChain === chain.id ? 'active' : ''} ${!allowed ? 'locked' : ''}`}
                            onClick={() => allowed ? onSelect(chain.id) : onUpgrade()}
                        >
                            <span className="chain-dot-mobile" />
                            <span className="chain-name-mobile">{chain.name}</span>
                            {!allowed && (
                                <span className="chain-lock-badge">
                                    <Lock size={10} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

export default ChainSelector;
