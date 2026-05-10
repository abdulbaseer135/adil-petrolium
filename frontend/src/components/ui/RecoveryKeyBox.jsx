import React from 'react';

const RecoveryKeyBox = ({ recoveryKey, copied }) => (
  <div
    style={{
      marginTop: 16,
      padding: '16px 18px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid color-mix(in oklch, var(--color-primary) 20%, var(--color-border))',
      background: 'color-mix(in oklch, var(--color-surface-2) 68%, var(--color-surface))',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 'var(--text-sm)',
      letterSpacing: '0.06em',
      wordBreak: 'break-word',
      color: 'var(--color-text)',
    }}
  >
    <div style={{ marginBottom: 8, fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
      Recovery Key
    </div>
    <div>{recoveryKey}</div>
    {copied ? (
      <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>Copied to clipboard</div>
    ) : null}
  </div>
);

export { RecoveryKeyBox };