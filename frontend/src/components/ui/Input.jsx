import React, { useId, useState } from 'react';

const isDateLikeType = (type) => type === 'date' || type === 'datetime-local';

export const Input = React.forwardRef(({
  label, error, hint, id, required, type = 'text', ...rest
}, ref) => {
  const autoId = useId();
  const inputId = id || autoId;
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const dateLike = isDateLikeType(type);
  const active = focused;

  const borderColor = error
    ? 'var(--color-error)'
    : active
      ? 'var(--color-primary)'
      : 'var(--color-border)';

  const boxShadow = error
    ? '0 0 0 3px color-mix(in oklch, var(--color-error) 14%, transparent)'
    : active
      ? '0 0 0 3px color-mix(in oklch, var(--color-primary) 14%, transparent)'
      : 'none';

  const baseControlStyle = {
    padding: isPassword ? '0 42px 0 var(--space-3)' : '0 var(--space-3)',
    height: 'var(--control-height-lg)',
    minHeight: 44,
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    background: active ? 'var(--color-surface-2)' : 'var(--color-surface)',
    color: 'var(--color-text)',
    outline: 'none',
    width: '100%',
    boxShadow,
    transition: 'border-color 150ms ease, box-shadow 150ms ease, background 150ms ease',
    fontVariantNumeric: type === 'number' ? 'tabular-nums' : undefined,
  };

  return (
    <div className="form-row">
      {label && (
        <label htmlFor={inputId} style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className="ui-input"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          style={{
            ...baseControlStyle,
            WebkitAppearance: dateLike ? 'auto' : undefined,
            appearance: dateLike ? 'auto' : undefined,
          }}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              borderRadius: '6px',
              transition: 'color 150ms ease, background 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <span id={`${inputId}-err`} role="alert" style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 3.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="6" cy="8.5" r="0.75" fill="currentColor" />
          </svg>
          {error}
        </span>
      )}

      {hint && !error && (
        <span id={`${inputId}-hint`} style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-faint)',
        }}>{hint}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
