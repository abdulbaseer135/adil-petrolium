import React from 'react';
import { Badge } from '../ui/Badge';
import { SkeletonTable } from '../ui/Skeleton';
import { EmptyState }    from '../ui/EmptyState';
import { ErrorState }    from '../ui/ErrorState';
import { Pagination }    from '../common/Pagination';
import { formatDatePK, formatNumberPK } from '../../utils/pkFormat';

const TYPE_VARIANTS = {
  fuel_sale:       { label: 'Fuel Sale',    color: 'warning' },
  payment:         { label: 'Payment',      color: 'success' },
  adjustment:      { label: 'Adjustment',   color: 'primary' },
  opening_balance: { label: 'Opening Bal.', color: 'neutral' },
  credit_note:     { label: 'Credit Note',  color: 'primary' },
};

const FUEL_TYPE_LABELS = {
  pmg: 'PMG',
  hsd: 'HSD',
  nr: 'NR',
};

const TH = ({ children, align = 'left' }) => (
  <th style={{ textAlign: align }}>
    {children}
  </th>
);

const TD = ({ children, align = 'left', bold, color }) => (
  <td style={{ textAlign: align, color: color || 'var(--color-text)' }} className={bold ? 'is-strong' : undefined}>
    {children}
  </td>
);

const fmt = (n) => n !== undefined && n !== null && n !== ''
  ? formatNumberPK(n, 2, 2)
  : '—';

const fmtQty = (n) => n !== undefined && n !== null && n !== ''
  ? formatNumberPK(n, 0, 0)
  : '—';

const fmtDate = (d) => formatDatePK(d);

export const Ledger = ({ data, loading, error, onRetry, pagination, onPageChange }) => {
  if (loading) return <SkeletonTable rows={8} cols={7} />;
  if (error)   return <ErrorState message={error} onRetry={onRetry} />;
  if (!data?.length) return (
    <EmptyState icon="🧾" title="No transactions yet" description="Transactions will appear here once recorded." />
  );

  return (
    <div>
      <div className="financial-table-shell">
        <div className="financial-table-wrap">
        <table className="financial-table" style={{ minWidth: 760 }}>
          <thead>
                    <tr>
                      <TH>Date</TH>
              <TH>Type</TH>
              <TH align="right">Fuel (L)</TH>
              <TH align="right">Rate</TH>
              <TH align="right">Debit</TH>
              <TH align="right">Payment</TH>
              <TH align="right">Balance</TH>
              <TH>Notes</TH>
            </tr>
          </thead>
          <tbody>
            {data.map((tx) => {
              const dateOnly = fmtDate(tx.transactionDate);
              const typeInfo = TYPE_VARIANTS[tx.transactionType] || { label: tx.transactionType, color: 'neutral' };
              const balance  = tx.updatedBalance;
              return (
                <tr key={tx._id}>
                  <TD>
                    <div style={{ fontWeight: 500 }}>{dateOnly}</div>
                  </TD>
                  <TD>
                    <Badge variant={typeInfo.color}>
                      {tx.transactionType === 'fuel_sale' && tx.fuelType
                        ? `${typeInfo.label} - ${FUEL_TYPE_LABELS[tx.fuelType] || tx.fuelType}`
                        : typeInfo.label}
                    </Badge>
                  </TD>
                  <TD align="right">{tx.fuelQuantity ? fmtQty(tx.fuelQuantity) : '—'}</TD>
                  <TD align="right">{tx.rate ? fmt(tx.rate) : '—'}</TD>
                  <TD align="right" color={tx.totalAmount > 0 ? 'var(--color-error)' : undefined}>
                    {tx.totalAmount > 0 ? fmt(tx.totalAmount) : '—'}
                  </TD>
                  <TD align="right" color={tx.paymentReceived > 0 ? 'var(--color-success)' : undefined}>
                    {tx.paymentReceived > 0 ? fmt(tx.paymentReceived) : '—'}
                  </TD>
                  <TD align="right" bold color={balance > 0 ? 'var(--color-error)' : 'var(--color-success)'}>
                    {fmt(balance)}
                  </TD>
                  <TD>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                      {tx.notes || '—'}
                    </span>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};