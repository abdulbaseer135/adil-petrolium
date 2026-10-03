import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({ message, onRetry }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12, 48px) var(--space-6, 24px)',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
        borderRadius: 'var(--radius-lg, 12px)',
        background: 'var(--color-danger-bg, #FDEEEE)',
        color: 'var(--color-danger, #C64040)',
        marginBottom: 'var(--space-3, 12px)',
      }}
    >
      <AlertTriangle size={26} strokeWidth={2.2} />
    </div>

    <h3
      style={{
        fontSize: 'var(--text-md, 16px)',
        fontWeight: 650,
        color: 'var(--color-text, #17242D)',
        margin: '0 0 var(--space-2, 8px)',
      }}
    >
      Something went wrong
    </h3>

    <p
      style={{
        color: 'var(--color-text-muted, #7A878E)',
        maxWidth: 360,
        fontSize: 'var(--text-sm, 13.5px)',
        margin: '0 0 var(--space-5, 20px)',
        lineHeight: 1.5,
      }}
    >
      {message || 'An unexpected error occurred. Please try again.'}
    </p>

    {onRetry && (
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);