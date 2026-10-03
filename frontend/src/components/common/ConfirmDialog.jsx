import React from 'react';
import { Button } from '../ui/Button';

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger }) => {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{ position: 'fixed', zIndex: 9999 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-container"
        style={{
          maxWidth: 440,
          padding: 'clamp(var(--space-4), 4vw, var(--space-8))',
        }}
      >
        <h2 id="confirm-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>
          {title || 'Are you sure?'}
        </h2>
        {message && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onCancel} style={{ minHeight: 40 }}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} style={{ minHeight: 40 }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};