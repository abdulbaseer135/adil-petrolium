import React, { useState } from 'react';

const variants = {
  primary: {
    base: {
      background: 'var(--color-primary)',
      color: '#fff',
      border: '1px solid var(--color-primary)',
      boxShadow: 'var(--shadow-sm)',
    },
    hover: {
      background: 'var(--color-primary-hover)',
      border: '1px solid var(--color-primary-hover)',
      boxShadow: '0 10px 18px color-mix(in oklch, var(--color-primary) 18%, transparent)',
    },
  },
  secondary: {
    base: {
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
    },
    hover: {
      background: 'color-mix(in oklch, var(--color-primary) 6%, var(--color-surface))',
      border: '1px solid color-mix(in oklch, var(--color-primary) 24%, var(--color-border))',
      boxShadow: 'var(--shadow-md)',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: 'var(--color-text-muted)',
      border: '1px solid transparent',
    },
    hover: {
      background: 'var(--color-surface-offset)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-divider)',
    },
  },
  danger: {
    base: {
      background: 'var(--color-error)',
      color: '#fff',
      border: '1px solid var(--color-error)',
      boxShadow: 'var(--shadow-sm)',
    },
    hover: {
      background: 'var(--color-error-hover)',
      border: '1px solid var(--color-error-hover)',
      boxShadow: '0 10px 18px color-mix(in oklch, var(--color-error) 18%, transparent)',
    },
  },
};

const sizes = {
  sm: {
    padding: '0 var(--space-3)',
    fontSize: 'var(--text-xs)',
    height: 'var(--control-height-sm)',
    borderRadius: 'var(--radius-md)',
  },
  md: {
    padding: '0 var(--space-4)',
    fontSize: 'var(--text-sm)',
    height: 'var(--control-height-md)',
    borderRadius: 'var(--radius-md)',
  },
  lg: {
    padding: '0 var(--space-5)',
    fontSize: 'var(--text-sm)',
    height: 'var(--control-height-lg)',
    borderRadius: 'var(--radius-lg)',
  },
};

if (typeof document !== 'undefined' && !document.getElementById('__btn_keyframes')) {
  const s = document.createElement('style');
  s.id = '__btn_keyframes';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
  type = 'button',
  style = {},
  fullWidth,
  iconLeft,
  iconRight,
  ...rest
}) => {
  const [hov, setHov] = useState(false);

  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const isOff = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isOff}
      onMouseEnter={() => !isOff && setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-busy={loading}
      aria-disabled={isOff}
      className={`ui-button ui-button--${size}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        minHeight: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: s.borderRadius,
        fontWeight: 650,
        cursor: isOff ? 'not-allowed' : 'pointer',
        opacity: isOff ? 0.56 : 1,
        transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, color 150ms ease',
        transform: hov && !isOff ? 'translateY(-1px)' : 'none',
        outline: 'none',
        ...((hov && !isOff) ? { ...v.base, ...v.hover } : v.base),
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span aria-hidden="true" style={{
          width: 13, height: 13, flexShrink: 0,
          border: '2px solid currentColor', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.65s linear infinite',
          display: 'inline-block',
        }} />
      )}
      {!loading && iconLeft && (
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>{iconLeft}</span>
      )}
      {children}
      {iconRight && (
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>{iconRight}</span>
      )}
    </button>
  );
};
