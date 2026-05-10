import React from 'react';

const colors = {
  success: { bg: 'var(--color-success-light)', color: 'var(--color-success)', border: 'color-mix(in oklch, var(--color-success) 16%, transparent)' },
  error: { bg: 'var(--color-error-light)', color: 'var(--color-error)', border: 'color-mix(in oklch, var(--color-error) 16%, transparent)' },
  warning: { bg: 'var(--color-warning-light)', color: 'var(--color-warning)', border: 'color-mix(in oklch, var(--color-warning) 16%, transparent)' },
  primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'color-mix(in oklch, var(--color-primary) 16%, transparent)' },
  gold: { bg: 'var(--color-gold-light)', color: 'var(--color-gold)', border: 'color-mix(in oklch, var(--color-gold) 16%, transparent)' },
  neutral: { bg: 'var(--color-surface-offset)', color: 'var(--color-text-muted)', border: 'var(--color-divider)' },
};

export const Badge = ({ children, variant = 'neutral', dot }) => {
  const tone = colors[variant] || colors.neutral;

  return (
    <span
      className={`ui-badge ui-badge--${variant}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '0.22rem var(--space-2)',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        border: `1px solid ${tone.border}`,
        boxShadow: '0 1px 1px rgba(16,33,43,0.03)',
        background: tone.bg,
        color: tone.color,
        lineHeight: 1,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
};
