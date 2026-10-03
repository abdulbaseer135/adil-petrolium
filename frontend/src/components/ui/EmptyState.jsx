import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  actionLabel,
}) => {
  const IconNode = icon || <Inbox size={38} strokeWidth={1.75} />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12, 48px) var(--space-6, 24px)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'var(--color-surface-offset, #F1F4F6)',
          color: 'var(--color-text-muted, #7A878E)',
          marginBottom: 'var(--space-3, 12px)',
        }}
      >
        {React.isValidElement(IconNode) ? IconNode : <span style={{ fontSize: 28 }}>{IconNode}</span>}
      </div>

      <h3
        style={{
          fontSize: 'var(--text-md, 16px)',
          fontWeight: 650,
          color: 'var(--color-text, #17242D)',
          margin: '0 0 var(--space-2, 8px)',
        }}
      >
        {title || 'Nothing here yet'}
      </h3>

      {description && (
        <p
          style={{
            maxWidth: 380,
            margin: '0 0 var(--space-5, 20px)',
            fontSize: 'var(--text-sm, 13.5px)',
            color: 'var(--color-text-muted, #7A878E)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action}>
          {actionLabel || 'Get started'}
        </Button>
      )}
    </div>
  );
};