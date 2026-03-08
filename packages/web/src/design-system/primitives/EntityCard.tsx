/**
 * EntityCard - Wallet/Contract entity display card
 * Shows address, labels, balance, risk score
 */

import React from 'react';
import { Badge, BadgeVariant } from './Badge';
import './EntityCard.css';

export interface EntityLabel {
  text: string;
  variant: BadgeVariant;
}

interface EntityCardProps {
  address: string;
  name?: string;
  labels?: EntityLabel[];
  balance?: string;
  balanceUsd?: string;
  chain?: string;
  chainIcon?: React.ReactNode;
  txCount?: number;
  firstSeen?: string;
  riskScore?: number; // 0-100
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  avatar?: string;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

export function EntityCard({
  address,
  name,
  labels = [],
  balance,
  balanceUsd,
  chain,
  chainIcon,
  txCount,
  firstSeen,
  riskScore,
  riskLevel,
  avatar,
  onClick,
  selected = false,
  compact = false,
  className = ''
}: EntityCardProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'low': return 'var(--risk-low)';
      case 'medium': return 'var(--risk-medium)';
      case 'high': return 'var(--risk-high)';
      case 'critical': return 'var(--risk-critical)';
      default: return 'var(--intel-text-muted)';
    }
  };

  const getRiskBarWidth = (score?: number) => {
    if (score === undefined) return '0%';
    return `${Math.min(100, Math.max(0, score))}%`;
  };

  if (compact) {
    return (
      <div 
        className={`entity-card entity-card--compact ${selected ? 'entity-card--selected' : ''} ${onClick ? 'entity-card--clickable' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="entity-card__avatar-mini">
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            <div className="entity-card__avatar-placeholder" />
          )}
        </div>
        
        <div className="entity-card__info-compact">
          <span className="entity-card__name-compact">
            {name || formatAddress(address)}
          </span>
          {balanceUsd && (
            <span className="entity-card__balance-compact">{balanceUsd}</span>
          )}
        </div>
        
        {labels.length > 0 && (
          <Badge variant={labels[0].variant} size="sm">
            {labels[0].text}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`entity-card ${selected ? 'entity-card--selected' : ''} ${onClick ? 'entity-card--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="entity-card__header">
        <div className="entity-card__avatar">
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            <div className="entity-card__avatar-placeholder">
              <span>{(name || address).charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        
        <div className="entity-card__identity">
          {name && <div className="entity-card__name">{name}</div>}
          <div className="entity-card__address">
            <span className="entity-card__address-text">{formatAddress(address)}</span>
            {chain && (
              <span className="entity-card__chain">
                {chainIcon}
                <span>{chain}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="entity-card__labels">
          {labels.map((label, i) => (
            <Badge key={i} variant={label.variant} size="sm">
              {label.text}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="entity-card__stats">
        {balance && (
          <div className="entity-card__stat">
            <span className="entity-card__stat-label">Balance</span>
            <span className="entity-card__stat-value">{balance}</span>
            {balanceUsd && (
              <span className="entity-card__stat-sub">{balanceUsd}</span>
            )}
          </div>
        )}
        
        {txCount !== undefined && (
          <div className="entity-card__stat">
            <span className="entity-card__stat-label">Transactions</span>
            <span className="entity-card__stat-value">{txCount.toLocaleString()}</span>
          </div>
        )}
        
        {firstSeen && (
          <div className="entity-card__stat">
            <span className="entity-card__stat-label">First Seen</span>
            <span className="entity-card__stat-value">{firstSeen}</span>
          </div>
        )}
      </div>

      {/* Risk Score */}
      {(riskScore !== undefined || riskLevel) && (
        <div className="entity-card__risk">
          <div className="entity-card__risk-header">
            <span className="entity-card__risk-label">Risk Score</span>
            {riskScore !== undefined && (
              <span 
                className="entity-card__risk-value"
                style={{ color: getRiskColor(riskLevel) }}
              >
                {riskScore}/100
              </span>
            )}
          </div>
          <div className="entity-card__risk-bar">
            <div 
              className="entity-card__risk-fill"
              style={{ 
                width: getRiskBarWidth(riskScore),
                backgroundColor: getRiskColor(riskLevel)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Entity list container
interface EntityListProps {
  children: React.ReactNode;
  className?: string;
}

export function EntityList({ children, className = '' }: EntityListProps) {
  return (
    <div className={`entity-list ${className}`}>
      {children}
    </div>
  );
}

export default EntityCard;
