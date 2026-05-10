import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('../../../src/api/transactionApi', () => ({
  createTransaction: jest.fn(),
}));

import { createTransaction } from '../../../src/api/transactionApi';
import { TransactionForm } from '../../../src/components/admin/TransactionForm';

describe('TransactionForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates required fields and shows errors', async () => {
    const onSuccess = jest.fn();
    render(<TransactionForm onSuccess={onSuccess} customerId={null} />);

    userEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    expect(await screen.findByText(/Customer is required/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('submits valid form and calls API', async () => {
    createTransaction.mockResolvedValueOnce({ data: { data: {} } });
    const onSuccess = jest.fn();
    render(<TransactionForm onSuccess={onSuccess} customerId={'cust-1'} currentBalance={500} />);

    userEvent.type(screen.getByLabelText(/Payment Received/i), '250');
    // date input exists
    const dateInput = screen.getByLabelText(/Date & Time/i);
    userEvent.clear(dateInput);
    userEvent.type(dateInput, '2024-01-01T10:00');

    userEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    await waitFor(() => expect(createTransaction).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows API error on failure', async () => {
    createTransaction.mockRejectedValueOnce({ response: { data: { message: 'Fail' } } });
    render(<TransactionForm onSuccess={() => {}} customerId={'cust-1'} currentBalance={100} />);

    userEvent.type(screen.getByLabelText(/Payment Received/i), '10');
    userEvent.click(screen.getByRole('button', { name: /Record Payment/i }));

    expect(await screen.findByText(/Fail/i)).toBeInTheDocument();
  });
});
