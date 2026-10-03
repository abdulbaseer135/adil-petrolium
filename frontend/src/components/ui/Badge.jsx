import React from 'react';

const colors = {
  success: { bg: 'var(--color-success-bg, #EAF7EF)', color: 'var(--color-success, #18864B)', border: 'var(--color-success-border, #C8EBD5)' },
  error:   { bg: 'var(--color-danger-bg, #FDEEEE)', color: 'var(--color-danger, #C64040)', border: 'var(--color-danger-border, #F7CACA)' },
  danger:  { bg: 'var(--color-danger-bg, #FDEEEE)', color: 'var(--color-danger, #C64040)', border: 'var(--color-danger-border, #F7CACA)' },
  warning: { bg: 'var(--color-warning-bg, #FFF6E5)', color: 'var(--color-warning, #C47B12)', border: 'var(--color-warning-border, #FCE6BD)' },
  info:    { bg: 'var(--color-info-bg, #EBF5FC)', color: 'var(--color-info, #2878B5)', border: 'var(--color-info-border, #C8E4F7)' },
  primary: { bg: 'var(--color-primary-soft, #EAF5F1)', color: 'var(--color-primary, #0B5D4B)', border: '#C6E7DC' },
  gold:    { bg: 'var(--color-accent-soft, #FDF6E9)', color: 'var(--color-accent, #D89B2B)', border: '#F7DFB3' },
  accent:  { bg: 'var(--color-accent-soft, #FDF6E9)', color: 'var(--color-accent, #D89B2B)', border: '#F7DFB3' },
  neutral: { bg: 'var(--color-surface-2, #F9FAFB)', color: 'var(--color-text-muted, #5B6870)', border: 'var(--color-border, #E2E8EC)' },
};

const statusMap = {
  approved: 'success',
  active: 'success',
  completed: 'success',
  cleared: 'success',
  pending: 'warning',
  partial: 'warning',
  rejected: 'danger',
  suspended: 'danger',
  debt: 'danger',
  failed: 'danger',
  info: 'info',
  information: 'info',
};

export const Badge = ({ children, variant, status, dot, style = {}, className = '' }) => {
  const effectiveVariant =
    (status && statusMap[String(status).toLowerCase()]) ||
    (variant && statusMap[String(variant).toLowerCase()]) ||
    variant ||
    'neutral';

  const tone = colors[effectiveVariant] || colors.neutral;

  return (
    <span
      className={`ui-badge ui-badge--${effectiveVariant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: '11px',
        fontWeight: 650,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        border: `1px solid ${tone.border}`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
        background: tone.bg,
        color: tone.color,
        lineHeight: 1.2,
        ...style,
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
      {children || status}
    </span>
  );
};
