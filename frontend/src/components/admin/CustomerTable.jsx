import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const TH = ({ children }) => (
  <th>
    {children}
  </th>
);

export const CustomerTable = ({ data, loading, onAdd }) => {
  const nav = useNavigate();

  const openLedger = (customerId) => {
    nav(`/admin/transactions?customerId=${customerId}`);
  };

  if (loading) return <SkeletonTable rows={6} cols={6} />;
  if (!data?.length) return (
    <EmptyState
      icon="👤"
      title="No customers yet"
      description="Add your first customer to get started."
      action={onAdd}
      actionLabel="+ Add Customer"
    />
  );

  return (
    <div className="financial-table-shell">
      <div className="financial-table-wrap">
      <table className="financial-table" style={{ minWidth: 680 }}>
        <thead>
          <tr>
            <TH>Code</TH>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Balance</TH>
            <TH>Status</TH>
            <TH>Action</TH>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr
              key={c._id}
              className="is-clickable"
              onClick={() => nav(`/admin/customers/${c._id}`)}
            >
              <td className="is-strong" style={{ color: 'var(--color-primary)' }}>
                {c.customerCode}
              </td>

              <td>
                {c.userId?.name || '—'}
              </td>

              <td className="is-muted">
                {c.userId?.email || '—'}
              </td>

              <td className="is-numeric is-strong" style={{ color: c.currentBalance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                PKR {Math.abs(c.currentBalance || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
              </td>

              <td>
                <Badge variant={c.isActive ? 'success' : 'neutral'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>

              <td
                onClick={e => e.stopPropagation()}
                style={{ padding: 0 }}
              >
                <div style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  height: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => nav(`/admin/customers/${c._id}`)}
                    style={{ fontSize: '0.8125rem', letterSpacing: '-0.01em' }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openLedger(c._id)}
                    style={{ fontSize: '0.8125rem', letterSpacing: '-0.01em', fontWeight: 600 }}
                  >
                    Ledger
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};