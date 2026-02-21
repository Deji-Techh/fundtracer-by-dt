interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--color-bg-hover) 0%, var(--color-bg-active) 50%, var(--color-bg-hover) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: string;
  gap?: string;
}

export function SkeletonText({ lines = 3, lineHeight = '16px', gap = '8px' }: SkeletonTextProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '75%' : '100%'}
          height={lineHeight}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  height?: string;
}

export function SkeletonCard({ height = '120px' }: SkeletonCardProps) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
      }}
    >
      <Skeleton width="60%" height="20px" borderRadius="4px" />
      <div style={{ marginTop: '12px' }}>
        <SkeletonText lines={2} lineHeight="14px" gap="6px" />
      </div>
    </div>
  );
}

interface SkeletonTableRowProps {
  columns: number;
}

export function SkeletonTableRow({ columns = 5 }: SkeletonTableRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '16px',
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height="16px" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="12px" width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
      }}
    >
      <Skeleton width="40%" height="12px" />
      <Skeleton width="60%" height="28px" style={{ marginTop: '12px' }} />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`,
        gap: '16px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}
