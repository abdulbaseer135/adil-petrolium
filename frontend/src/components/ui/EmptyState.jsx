import React from 'react';
import { Button } from './Button';

export const EmptyState = ({ icon = '📂', title, description, action, actionLabel }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-16) var(--space-8)', textAlign: 'center',
    color: 'var(--color-text-muted)',
  }}>
    <div style={{ fontSize: 40, marginBottom: 'var(--space-4)', opacity: 0.6 }}>{icon}</div>
    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text)',
      marginBottom: 'var(--space-2)' }}>
      {title || 'Nothing here yet'}
    </h3>
    {description && (
      <p style={{ maxWidth: 340, marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        {description}
      </p>
    )}
    {action && <Button onClick={action}>{actionLabel || 'Get started'}</Button>}
  </div>
);