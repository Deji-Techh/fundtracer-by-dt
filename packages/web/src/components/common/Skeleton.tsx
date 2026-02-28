import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px',
  style,
  className 
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--color-bg-elevated) 25%, var(--color-border) 50%, var(--color-bg-elevated) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function WalletCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Skeleton width={40} height={40} borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: '8px' }} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <Skeleton height={48} />
        <Skeleton height={48} />
        <Skeleton height={48} />
      </div>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-border)',
      gap: '12px',
    }}>
      <Skeleton width={32} height={32} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="50%" height={14} style={{ marginBottom: '6px' }} />
        <Skeleton width="30%" height={12} />
      </div>
      <Skeleton width={80} height={24} borderRadius="4px" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '16px',
      padding: '16px',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={16} />
      ))}
    </div>
  );
}

export function TokenRowSkeleton() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-border)',
      gap: '12px',
    }}>
      <Skeleton width={36} height={36} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="40%" height={16} style={{ marginBottom: '4px' }} />
        <Skeleton width="25%" height={12} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <Skeleton width={60} height={16} style={{ marginBottom: '4px' }} />
        <Skeleton width={40} height={12} />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} />
      </div>
      <Skeleton height={200} style={{ marginBottom: '16px' }} />
      <div style={{ display: 'flex', gap: '16px' }}>
        <Skeleton height={32} style={{ flex: 1 }} />
        <Skeleton height={32} style={{ flex: 1 }} />
        <Skeleton height={32} style={{ flex: 1 }} />
      </div>
    </div>
  );
}

export function AnalysisCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <Skeleton width={160} height={24} style={{ marginBottom: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
      <Skeleton height={100} />
    </div>
  );
}
