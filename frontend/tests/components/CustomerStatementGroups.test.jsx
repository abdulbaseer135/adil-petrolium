import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import CustomerStatementGroups, { buildCustomerStatementGroups } from '../../../src/components/admin/CustomerStatementGroups';

const makeTx = (overrides = {}) => ({
  _id: overrides._id || Math.random().toString(36).slice(2),
  transactionDate: overrides.transactionDate || new Date().toISOString(),
  totalAmount: overrides.totalAmount ?? 100,
  paymentReceived: overrides.paymentReceived ?? 0,
  updatedBalance: overrides.updatedBalance ?? 100,
  fuelQuantity: overrides.fuelQuantity ?? 10,
  fuelType: overrides.fuelType || 'PMG',
  customerId: overrides.customerId || { _id: 'c1', customerCode: 'C001', userId: { name: 'Alice' } },
});

describe('CustomerStatementGroups component & helpers', () => {
  it('builds groups from transactions', () => {
    const txs = [makeTx({ customerId: { _id: 'c1', userId: { name: 'A' } }, transactionDate: '2023-01-01' }), makeTx({ customerId: { _id: 'c2', userId: { name: 'B' } }, transactionDate: '2023-01-02' })];
    const groups = buildCustomerStatementGroups(txs);
    expect(groups).toHaveLength(2);
    expect(groups[0].customerName).toBeDefined();
  });

  it('renders empty state when groups is empty', () => {
    render(<CustomerStatementGroups groups={[]} />);
    expect(screen.getByText(/No customer statements found/i)).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    render(<CustomerStatementGroups loading={true} />);
    // SkeletonTable outputs table rows; just assert absence of empty state text
    expect(screen.queryByText(/No customer statements found/i)).not.toBeInTheDocument();
  });

  it('renders error state and calls retry action', () => {
    const onRetry = jest.fn();
    render(<CustomerStatementGroups error={'Failed'} onRetry={onRetry} />);
    expect(screen.getByText(/Could not load customer statements/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Try Again/i });
    btn && btn.click();
    expect(onRetry).toHaveBeenCalled();
  });
});
