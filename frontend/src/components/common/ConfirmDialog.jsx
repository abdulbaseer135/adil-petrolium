import React from 'react';
import { Button } from '../ui/Button';

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)',
    }} onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)', maxWidth: 420, width: '100%',
        boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 160ms ease-out',
      }}>
        <h2 id="confirm-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 600,
          marginBottom: 'var(--space-3)' }}>
          {title || 'Are you sure?'}
        </h2>
        {message && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-6)' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};