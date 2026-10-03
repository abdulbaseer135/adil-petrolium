import React, { useState } from 'react';

const variants = {
  primary: {
    base: {
      background: 'var(--color-primary, #0B5D4B)',
      color: '#ffffff',
      border: '1px solid var(--color-primary, #0B5D4B)',
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.04))',
    },
    hover: {
      background: 'var(--color-primary-hover, #084A3C)',
      border: '1px solid var(--color-primary-hover, #084A3C)',
      boxShadow: '0 2px 6px rgba(11, 93, 75, 0.25)',
    },
  },
  secondary: {
    base: {
      background: 'var(--color-secondary, #1F3A4D)',
      color: '#ffffff',
      border: '1px solid var(--color-secondary, #1F3A4D)',
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.04))',
    },
    hover: {
      background: 'var(--color-secondary-hover, #162C3B)',
      border: '1px solid var(--color-secondary-hover, #162C3B)',
      boxShadow: '0 2px 6px rgba(31, 58, 77, 0.25)',
    },
  },
  outline: {
    base: {
      background: 'var(--color-surface, #ffffff)',
      color: 'var(--color-text, #17242D)',
      border: '1px solid var(--color-border, #E2E8EC)',
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.04))',
    },
    hover: {
      background: 'var(--color-surface-2, #F9FAFB)',
      border: '1px solid #CBD5E1',
      color: 'var(--color-text, #17242D)',
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: 'var(--color-text-muted, #5B6870)',
      border: '1px solid transparent',
    },
    hover: {
      background: 'var(--color-surface-offset, #F1F4F6)',
      color: 'var(--color-text, #17242D)',
      border: '1px solid var(--color-divider, #E8ECEF)',
    },
  },
  danger: {
    base: {
      background: 'var(--color-danger, #C64040)',
      color: '#ffffff',
      border: '1px solid var(--color-danger, #C64040)',
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.04))',
    },
    hover: {
      background: '#A83232',
      border: '1px solid #A83232',
      boxShadow: '0 2px 6px rgba(198, 64, 64, 0.25)',
    },
  },
};

const sizes = {
  sm: {
    padding: '0 10px',
    fontSize: 'var(--text-xs, 12px)',
    height: 'var(--control-height-sm, 32px)',
    borderRadius: 'var(--radius-sm, 6px)',
  },
  md: {
    padding: '0 16px',
    fontSize: 'var(--text-sm, 13.5px)',
    height: 'var(--control-height-md, 40px)',
    borderRadius: 'var(--radius-md, 8px)',
  },
  lg: {
    padding: '0 20px',
    fontSize: 'var(--text-base, 14px)',
    height: 'var(--control-height-lg, 44px)',
    borderRadius: 'var(--radius-md, 8px)',
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
      className={`ui-button ui-button--${size} ui-button--${variant}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2, 8px)',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        minHeight: s.height,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: s.borderRadius,
        fontWeight: 600,
        cursor: isOff ? 'not-allowed' : 'pointer',
        opacity: isOff ? 0.55 : 1,
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
          width: 14, height: 14, flexShrink: 0,
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
