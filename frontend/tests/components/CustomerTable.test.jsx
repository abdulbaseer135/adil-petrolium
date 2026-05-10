import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { CustomerTable } from '../../../src/components/admin/CustomerTable';

const makeCustomer = (i = 1) => ({
  _id: `id-${i}`,
  customerCode: `C00${i}`,
  userId: { name: `User ${i}`, email: `u${i}@example.com` },
  currentBalance: i % 2 === 0 ? -100 * i : 100 * i,
  isActive: i % 2 === 1,
});

describe('CustomerTable', () => {
  it('shows empty state when no data', () => {
    const onAdd = jest.fn();
    render(<CustomerTable data={[]} loading={false} onAdd={onAdd} />);
    expect(screen.getByText(/No customers yet/i)).toBeInTheDocument();
    userEvent.click(screen.getByText(/\+ Add Customer/i));
    expect(onAdd).toHaveBeenCalled();
  });

  it('renders rows and action buttons for admin', () => {
    const data = [makeCustomer(1), makeCustomer(2)];
    render(<CustomerTable data={data} loading={false} onAdd={() => {}} />);
    expect(screen.getByText('C001')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    // action buttons
    expect(screen.getAllByRole('button', { name: /View/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Ledger/i })[0]).toBeInTheDocument();
  });
});
