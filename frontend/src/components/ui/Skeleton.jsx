import React from 'react';

const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--color-surface-offset) 25%, var(--color-surface-dynamic) 50%, var(--color-surface-offset) 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-sm)',
};

/* ─── Base skeleton bar ─── */
export const Skeleton = ({ width = '100%', height = 16, style = {} }) => (
  <div
    aria-hidden="true"
    role="presentation"
    style={{ width, height, ...shimmerStyle, ...style }}
  />
);

/* ─── Table skeleton ─── */
export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    {/* Header row */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 'var(--space-3)',
      paddingBottom: 'var(--space-3)',
      borderBottom: '1px solid var(--color-divider)',
      marginBottom: 'var(--space-1)',
    }}>
      {[...Array(cols)].map((_, c) => (
        <Skeleton key={c} height={10} width="50%" style={{ opacity: 0.6 }} />
      ))}
    </div>
    {/* Data rows */}
    {[...Array(rows)].map((_, r) => (
      <div key={r} style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 'var(--space-3)',
        padding: 'var(--space-2) 0',
        borderBottom: '1px solid var(--color-divider)',
        opacity: 1 - r * 0.12,
      }}>
        {[...Array(cols)].map((_, c) => (
          <Skeleton key={c} height={13}
            width={c === 0 ? '30%' : c === cols - 1 ? '55%' : '80%'} />
        ))}
      </div>
    ))}
  </div>
);

/* ─── KPI card skeleton — matches Dashboard KPI layout ─── */
export const SkeletonCard = () => (
  <div style={{
    padding: 'var(--space-4)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    boxShadow: 'var(--shadow-sm)',
  }}>
    {/* Label row with icon placeholder */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton width="45%" height={10} />
      <Skeleton width={28} height={28} style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
    </div>
    {/* Value */}
    <Skeleton width="65%" height={26} />
    {/* Sub label */}
    <Skeleton width="40%" height={10} style={{ opacity: 0.6 }} />
    {/* Accent bar */}
    <Skeleton width="100%" height={3} style={{ borderRadius: 2, opacity: 0.4 }} />
  </div>
);

/* ─── Form skeleton ─── */
export const SkeletonForm = ({ fields = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    {[...Array(fields)].map((_, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <Skeleton width="30%" height={10} />
        <Skeleton width="100%" height={36} style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
    ))}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
      <Skeleton width={80} height={34} style={{ borderRadius: 'var(--radius-md)' }} />
      <Skeleton width={120} height={34} style={{ borderRadius: 'var(--radius-md)' }} />
    </div>
  </div>
);

/* ─── List row skeleton ─── */
export const SkeletonList = ({ rows = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {[...Array(rows)].map((_, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-divider)',
        opacity: 1 - i * 0.12,
      }}>
        <Skeleton width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <Skeleton width="40%" height={13} />
          <Skeleton width="25%" height={10} style={{ opacity: 0.6 }} />
        </div>
        <Skeleton width={80} height={13} style={{ flexShrink: 0 }} />
      </div>
    ))}
  </div>
);