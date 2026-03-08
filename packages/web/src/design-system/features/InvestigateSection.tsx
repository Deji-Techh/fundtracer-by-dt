/**
 * InvestigateSection - Arkham-style wallet/contract investigation UI
 * Main investigation interface with chain selector, input, and results
 */

import React, { useState, useCallback } from 'react';
import { Panel, Badge, StatGrid, StatBlock, DataGrid, Column, EntityCard } from '../primitives';
import './InvestigateSection.css';

// Types
export type InvestigateMode = 'wallet' | 'contract' | 'compare' | 'sybil';

export interface ChainOption {
  id: string;
  name: string;
  icon?: React.ReactNode;
  locked?: boolean;
  requiredTier?: string;
}

interface InvestigateSectionProps {
  mode: InvestigateMode;
  onModeChange: (mode: InvestigateMode) => void;
  chains: ChainOption[];
  selectedChain: string;
  onChainChange: (chainId: string) => void;
  onAnalyze: (addresses: string[], mode: InvestigateMode) => void;
  loading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// Mode configuration
const MODES: { id: InvestigateMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'wallet',
    label: 'Wallet',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
        <path d="M6 15h4"/>
      </svg>
    ),
    description: 'Analyze a single wallet address'
  },
  {
    id: 'contract',
    label: 'Contract',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M10 13h4"/>
        <path d="M10 17h4"/>
      </svg>
    ),
    description: 'Scan smart contract for risks'
  },
  {
    id: 'compare',
    label: 'Compare',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 3h5v5"/>
        <path d="M8 21H3v-5"/>
        <path d="M21 3l-9 9"/>
        <path d="M3 21l9-9"/>
      </svg>
    ),
    description: 'Compare multiple wallets for connections'
  },
  {
    id: 'sybil',
    label: 'Sybil',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M12 8v4"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
    description: 'Detect Sybil attack patterns'
  }
];

export function InvestigateSection({
  mode,
  onModeChange,
  chains,
  selectedChain,
  onChainChange,
  onAnalyze,
  loading = false,
  disabled = false,
  children,
  className = ''
}: InvestigateSectionProps) {
  const [addresses, setAddresses] = useState<string[]>(['']);
  const [showGuide, setShowGuide] = useState(false);

  const handleAddAddress = () => {
    if (mode === 'compare' || mode === 'sybil') {
      setAddresses([...addresses, '']);
    }
  };

  const handleRemoveAddress = (index: number) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter((_, i) => i !== index));
    }
  };

  const handleAddressChange = (index: number, value: string) => {
    const updated = [...addresses];
    updated[index] = value;
    setAddresses(updated);
  };

  const handleAnalyze = () => {
    const validAddresses = addresses.filter(a => a.trim());
    if (validAddresses.length > 0) {
      onAnalyze(validAddresses, mode);
    }
  };

  const isValidAddress = (addr: string) => {
    if (!addr) return true;
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const canAnalyze = () => {
    const validAddresses = addresses.filter(a => a.trim() && isValidAddress(a));
    if (mode === 'compare') return validAddresses.length >= 2;
    return validAddresses.length >= 1;
  };

  return (
    <div className={`investigate-section ${className}`}>
      {/* Mode Tabs */}
      <div className="investigate-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`investigate-mode ${mode === m.id ? 'investigate-mode--active' : ''}`}
            onClick={() => {
              onModeChange(m.id);
              // Reset addresses when switching modes
              if (m.id === 'wallet' || m.id === 'contract') {
                setAddresses([addresses[0] || '']);
              }
            }}
            title={m.description}
          >
            <span className="investigate-mode__icon">{m.icon}</span>
            <span className="investigate-mode__label">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Chain Selector */}
      <div className="investigate-chain">
        <label className="investigate-label">Network</label>
        <div className="investigate-chain__grid">
          {chains.map((chain) => (
            <button
              key={chain.id}
              className={`investigate-chain__btn ${selectedChain === chain.id ? 'investigate-chain__btn--active' : ''} ${chain.locked ? 'investigate-chain__btn--locked' : ''}`}
              onClick={() => !chain.locked && onChainChange(chain.id)}
              disabled={chain.locked}
            >
              {chain.icon && <span className="investigate-chain__icon">{chain.icon}</span>}
              <span className="investigate-chain__name">{chain.name}</span>
              {chain.locked && (
                <Badge variant="warning" size="xs">{chain.requiredTier || 'PRO'}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="investigate-input">
        <div className="investigate-input__header">
          <label className="investigate-label">
            {mode === 'wallet' && 'Wallet Address'}
            {mode === 'contract' && 'Contract Address'}
            {mode === 'compare' && 'Wallet Addresses'}
            {mode === 'sybil' && 'Addresses to Check'}
          </label>
          <button 
            className="investigate-guide-toggle"
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide Guide' : 'Show Guide'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={showGuide ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
            </svg>
          </button>
        </div>

        {/* Guide Panel */}
        {showGuide && (
          <div className="investigate-guide">
            <div className="investigate-guide__content">
              {mode === 'wallet' && (
                <>
                  <h4>Wallet Analysis</h4>
                  <p>Enter an Ethereum wallet address to analyze its transaction history, risk score, and on-chain activity.</p>
                  <ul>
                    <li>View all transactions and token transfers</li>
                    <li>Get a risk assessment score</li>
                    <li>See connected wallets and contracts</li>
                  </ul>
                </>
              )}
              {mode === 'contract' && (
                <>
                  <h4>Contract Scanner</h4>
                  <p>Scan a smart contract to check for security risks, verify source code, and analyze its interactions.</p>
                  <ul>
                    <li>Check contract verification status</li>
                    <li>Detect common vulnerabilities</li>
                    <li>View top token holders</li>
                  </ul>
                </>
              )}
              {mode === 'compare' && (
                <>
                  <h4>Wallet Comparison</h4>
                  <p>Compare multiple wallets to find connections, shared transactions, and potential links.</p>
                  <ul>
                    <li>Detect direct transfers between wallets</li>
                    <li>Find common counterparties</li>
                    <li>Calculate correlation scores</li>
                  </ul>
                </>
              )}
              {mode === 'sybil' && (
                <>
                  <h4>Sybil Detection</h4>
                  <p>Advanced analysis to detect Sybil attack patterns and airdrop farming clusters.</p>
                  <ul>
                    <li>Identify wallet clusters</li>
                    <li>Detect suspicious patterns</li>
                    <li>Generate investigation reports</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* Address Inputs */}
        <div className="investigate-addresses">
          {addresses.map((addr, index) => (
            <div key={index} className="investigate-address">
              <input
                type="text"
                className={`investigate-address__input ${!isValidAddress(addr) ? 'investigate-address__input--invalid' : ''}`}
                value={addr}
                onChange={(e) => handleAddressChange(index, e.target.value)}
                placeholder={mode === 'contract' ? 'Contract address (0x...)' : `Wallet address ${mode === 'compare' ? `#${index + 1}` : ''} (0x...)`}
                spellCheck={false}
              />
              {(mode === 'compare' || mode === 'sybil') && addresses.length > 1 && (
                <button
                  className="investigate-address__remove"
                  onClick={() => handleRemoveAddress(index)}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          ))}

          {(mode === 'compare' || mode === 'sybil') && (
            <button className="investigate-add-btn" onClick={handleAddAddress}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Address
            </button>
          )}
        </div>

        {/* Analyze Button */}
        <button
          className="investigate-analyze-btn"
          onClick={handleAnalyze}
          disabled={!canAnalyze() || loading || disabled}
        >
          {loading ? (
            <>
              <span className="investigate-spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              {mode === 'wallet' && 'Analyze Wallet'}
              {mode === 'contract' && 'Scan Contract'}
              {mode === 'compare' && 'Compare Wallets'}
              {mode === 'sybil' && 'Detect Sybil'}
            </>
          )}
        </button>
      </div>

      {/* Results Area - passed as children */}
      {children && (
        <div className="investigate-results">
          {children}
        </div>
      )}
    </div>
  );
}

export default InvestigateSection;
