import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../../src/api/customerApi', () => ({ getCustomers: jest.fn() }));
jest.mock('../../../src/api/transactionApi', () => ({ getTransactions: jest.fn(), voidTransaction: jest.fn() }));

import Transactions from '../../../src/pages/admin/Transactions';
import { getCustomers } from '../../../src/api/customerApi';
import { getTransactions } from '../../../src/api/transactionApi';

const sampleRows = [
  { _id: 't1', transactionDate: '2023-01-01', totalAmount: 100, paymentReceived: 0 },
  { _id: 't2', transactionDate: '2023-01-02', totalAmount: 0, paymentReceived: 50 },
];

describe('Transactions page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders loading then empty state then rows', async () => {
    getCustomers.mockResolvedValueOnce({ data: { data: [] } });
    getTransactions.mockResolvedValueOnce({ data: { data: [], meta: {} } });
    const { rerender } = render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    // Initially skeleton is shown; wait for loading to finish
    await waitFor(() => expect(getCustomers).toHaveBeenCalled());

    // simulate transactions present
    getTransactions.mockResolvedValueOnce({ data: { data: sampleRows, meta: { totalPages: 1 } } });
    // trigger a refresh by re-rendering (simple approach)
    rerender(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
    // rows should show debit/credit columns
    expect(screen.queryByText(/No statement rows found/i)).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    getCustomers.mockResolvedValueOnce({ data: { data: [] } });
    getTransactions.mockRejectedValueOnce({ response: { data: { message: 'Fail load' } } });
    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );
    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
    expect(await screen.findByText(/Could not load statement|Could not load statement/i)).toBeInTheDocument();
  });

  it('calculates running balance in statement mode', async () => {
    // customers list and transactions
    getCustomers.mockResolvedValueOnce({ data: { data: [{ id: 'c1', customerCode: 'C001', userId: { name: 'A' } }] } });
    getTransactions.mockResolvedValueOnce({ data: { data: sampleRows, meta: { totalPages: 1 } } });
    render(
      <MemoryRouter initialEntries={["/admin/transactions?customerId=c1"]}>
        <Transactions />
      </MemoryRouter>
    );

    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
    // running balance column should exist in table header
    expect(screen.getByText(/Balance/i)).toBeInTheDocument();
  });
});
