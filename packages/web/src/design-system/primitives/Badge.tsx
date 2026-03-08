/**
 * Badge - Arkham-style entity labels and status tags
 */

import React from 'react';
import './Badge.css';

export type BadgeVariant = 
  | 'default'
  | 'whale'
  | 'exchange'
  | 'defi'
  | 'nft'
  | 'bridge'
  | 'scam'
  | 'fund'
  | 'dao'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className = '',
  onClick
}: BadgeProps) {
  return (
    <span 
      className={`intel-badge intel-badge--${variant} intel-badge--${size} ${onClick ? 'intel-badge--clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {dot && <span className="intel-badge__dot" />}
      {icon && <span className="intel-badge__icon">{icon}</span>}
      <span className="intel-badge__text">{children}</span>
    </span>
  );
}

// Pre-styled entity badges
export function WhaleBadge() {
  return <Badge variant="whale" dot>Whale</Badge>;
}

export function ExchangeBadge({ name }: { name?: string }) {
  return <Badge variant="exchange">{name || 'Exchange'}</Badge>;
}

export function DeFiBadge({ protocol }: { protocol?: string }) {
  return <Badge variant="defi">{protocol || 'DeFi'}</Badge>;
}

export function ScamBadge() {
  return <Badge variant="scam" dot>Scam</Badge>;
}

export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
  const variants: Record<string, BadgeVariant> = {
    low: 'success',
    medium: 'warning',
    high: 'warning',
    critical: 'danger'
  };
  return (
    <Badge variant={variants[level]} dot>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  );
}

export default Badge;
