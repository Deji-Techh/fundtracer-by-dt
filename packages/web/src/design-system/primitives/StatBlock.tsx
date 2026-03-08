/**
 * StatBlock - Metric display component for dashboards
 */

import React from 'react';
import './StatBlock.css';

interface StatBlockProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number; // percentage change
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  className?: string;
}

export function StatBlock({
  label,
  value,
  subValue,
  change,
  icon,
  size = 'md',
  trend,
  loading = false,
  className = ''
}: StatBlockProps) {
  // Auto-detect trend from change if not provided
  const actualTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : undefined);
  
  if (loading) {
    return (
      <div className={`stat-block stat-block--${size} stat-block--loading ${className}`}>
        <div className="stat-block__label skeleton" style={{ width: '60%', height: '12px' }} />
        <div className="stat-block__value skeleton" style={{ width: '80%', height: '24px', marginTop: '8px' }} />
      </div>
    );
  }

  return (
    <div className={`stat-block stat-block--${size} ${className}`}>
      <div className="stat-block__header">
        <span className="stat-block__label">{label}</span>
        {icon && <span className="stat-block__icon">{icon}</span>}
      </div>
      
      <div className="stat-block__content">
        <span className="stat-block__value">{value}</span>
        
        {change !== undefined && (
          <span className={`stat-block__change stat-block__change--${actualTrend}`}>
            {actualTrend === 'up' && '▲'}
            {actualTrend === 'down' && '▼'}
            {actualTrend === 'neutral' && '―'}
            {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      
      {subValue && (
        <div className="stat-block__sub-value">{subValue}</div>
      )}
    </div>
  );
}

// Grid container for multiple stats
interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatGrid({ children, columns = 4, className = '' }: StatGridProps) {
  return (
    <div className={`stat-grid stat-grid--cols-${columns} ${className}`}>
      {children}
    </div>
  );
}

export default StatBlock;
