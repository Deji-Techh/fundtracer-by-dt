import React, { useState } from 'react';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useAuth } from '../contexts/AuthContext';
import { Lock, ChevronDown } from 'lucide-react';
import './ChainSelector.css';

interface ChainSelectorProps {
    selectedChain: ChainId;
    onSelect: (chainId: ChainId) => void;
    onUpgrade: () => void;
}

function ChainSelector({ selectedChain, onSelect, onUpgrade }: ChainSelectorProps) {
    const { profile } = useAuth();
    const chains = Object.values(CHAINS);
    const tier = (profile?.tier || 'free').toLowerCase();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const isChainAllowed = (chainId: ChainId) => {
        if (tier === 'max') return true;
        if (tier === 'pro') return ['linea', 'arbitrum', 'base'].includes(chainId);
        return chainId === 'linea';
    };

    const selectedChainData = chains.find(c => c.id === selectedChain);

    const handleChainSelect = (chainId: ChainId) => {
        const allowed = isChainAllowed(chainId);
        if (allowed) {
            onSelect(chainId);
            setIsDropdownOpen(false);
        } else {
            onUpgrade();
            setIsDropdownOpen(false);
        }
    };

    return (
        <>
            {/* Desktop View - Horizontal buttons */}
            <div className="chain-selector-desktop">
                {chains.map((chain) => {
                    const allowed = isChainAllowed(chain.id);
                    return (
                        <button
                            key={chain.id}
                            className={`chain-btn ${selectedChain === chain.id ? 'chain-btn-active' : ''}`}
                            onClick={() => handleChainSelect(chain.id)}
                        >
                            <span className={`chain-dot ${selectedChain === chain.id ? 'chain-dot-active' : ''}`} />
                            {chain.name}
                            {!allowed && (
                                <span className="chain-lock">
                                    <Lock size={10} />
                                    {tier === 'free' ? 'PRO' : 'MAX'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Mobile View - Dropdown */}
            <div className="chain-selector-mobile">
                <button 
                    className="chain-dropdown-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <span className="chain-dot chain-dot-active" />
                    <span className="chain-selected-name">{selectedChainData?.name}</span>
                    <ChevronDown size={16} className={`chain-chevron ${isDropdownOpen ? 'chain-chevron-open' : ''}`} />
                </button>

                {isDropdownOpen && (
                    <div className="chain-dropdown-menu">
                        {chains.map((chain) => {
                            const allowed = isChainAllowed(chain.id);
                            return (
                                <button
                                    key={chain.id}
                                    className={`chain-dropdown-item ${selectedChain === chain.id ? 'chain-dropdown-item-active' : ''}`}
                                    onClick={() => handleChainSelect(chain.id)}
                                >
                                    <span className={`chain-dot ${selectedChain === chain.id ? 'chain-dot-active' : ''}`} />
                                    <span className="chain-item-name">{chain.name}</span>
                                    {!allowed && (
                                        <span className="chain-lock-mobile">
                                            <Lock size={10} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export default ChainSelector;
