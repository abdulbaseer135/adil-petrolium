import React from 'react';

export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left  = page - delta;
  const right = page + delta + 1;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i < right)) {
      pages.push(i);
    }
  }

  const btnStyle = (active) => ({
    minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400,
    cursor: 'pointer', border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? '#fff' : 'var(--color-text)', transition: 'all var(--transition)',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 'var(--space-4)' }}>
      <button style={btnStyle(false)} disabled={page === 1}
        onClick={() => onPageChange(page - 1)}>‹</button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        return (
          <React.Fragment key={p}>
            {prev && p - prev > 1 && (
              <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>…</span>
            )}
            <button style={btnStyle(p === page)} onClick={() => onPageChange(p)}>{p}</button>
          </React.Fragment>
        );
      })}
      <button style={btnStyle(false)} disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}>›</button>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
        Page {page} of {totalPages}
      </span>
    </div>
  );
};