import React from 'react';
import { Button } from './Button';

export const ErrorState = ({ message, onRetry }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-12) var(--space-8)', textAlign: 'center',
  }}>
    <div style={{ fontSize: 36, marginBottom: 'var(--space-4)' }}>⚠️</div>
    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)',
      marginBottom: 'var(--space-2)' }}>
      Something went wrong
    </h3>
    <p style={{ color: 'var(--color-text-muted)', maxWidth: 320, fontSize: 'var(--text-sm)',
      marginBottom: 'var(--space-5)' }}>
      {message || 'An unexpected error occurred. Please try again.'}
    </p>
    {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
  </div>
);