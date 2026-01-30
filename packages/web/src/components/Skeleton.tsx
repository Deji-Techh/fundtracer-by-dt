interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', className }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--color-surface) 0%, var(--color-surface-hover) 50%, var(--color-surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
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
        backgroundColor: 'var(--color-surface)',
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
