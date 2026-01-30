import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = '',
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
};

// Skeleton for cards
export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <Skeleton width="60%" height="24px" />
      <Skeleton width="100%" height="16px" />
      <Skeleton width="80%" height="16px" />
      <div className="skeleton-row">
        <Skeleton width="30%" height="32px" />
        <Skeleton width="30%" height="32px" />
      </div>
    </div>
  );
};

// Skeleton for analysis results
export const SkeletonAnalysis: React.FC = () => {
  return (
    <div className="skeleton-analysis">
      <div className="skeleton-header">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="100px" height="24px" />
      </div>
      
      <div className="skeleton-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-stat-card">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="28px" />
          </div>
        ))}
      </div>
      
      <div className="skeleton-section">
        <Skeleton width="150px" height="24px" />
        <Skeleton width="100%" height="200px" borderRadius="8px" />
      </div>
      
      <div className="skeleton-transactions">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-transaction-row">
            <Skeleton width="120px" height="16px" />
            <Skeleton width="80px" height="16px" />
            <Skeleton width="100px" height="16px" />
            <Skeleton width="60px" height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton for wallet info
export const SkeletonWalletInfo: React.FC = () => {
  return (
    <div className="skeleton-wallet-info">
      <div className="skeleton-avatar">
        <Skeleton width="64px" height="64px" borderRadius="50%" />
      </div>
      <div className="skeleton-details">
        <Skeleton width="200px" height="24px" />
        <Skeleton width="300px" height="16px" />
        <div className="skeleton-tags">
          <Skeleton width="80px" height="24px" borderRadius="12px" />
          <Skeleton width="60px" height="24px" borderRadius="12px" />
        </div>
      </div>
    </div>
  );
};

// Skeleton for table
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="80%" height="20px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="70%" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
