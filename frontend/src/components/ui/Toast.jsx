import React from 'react';

export default function Toast({ toast, onClose }) {
  const { id, title, message, variant = 'success', action } = toast;

  const color = variant === 'error' ? 'var(--color-error)' : variant === 'warning' ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minWidth: 280,
        maxWidth: 360,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${color}`,
        padding: '12px 14px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--color-text)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {title ? <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div> : null}
          {message ? <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{message}</div> : null}
          {action ? (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  try {
                    action.onClick?.();
                  } catch (e) {}
                  onClose(id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 700,
                }}
              >
                {action.label || 'Open'}
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <button
            aria-label="dismiss"
            onClick={() => onClose(id)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
