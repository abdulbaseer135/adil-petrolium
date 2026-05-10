import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../src/api/transactionApi', () => ({ getTransactions: jest.fn() }));

import { useTransactions } from '../../../src/hooks/useTransactions';
import { getTransactions } from '../../../src/api/transactionApi';

function TestComp(props) {
  const { data, loading, error, reload } = useTransactions(props);
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error || ''}</div>
      <div data-testid="count">{data.length}</div>
      <button onClick={() => reload()}>reload</button>
    </div>
  );
}

describe('useTransactions hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads data and transitions loading -> success', async () => {
    getTransactions.mockResolvedValueOnce({ data: { data: [{ id: 1 }], meta: {} } });
    render(<TestComp />);
    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('handles API error', async () => {
    getTransactions.mockRejectedValueOnce({ response: { data: { message: 'err' } } });
    render(<TestComp />);
    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
    expect(screen.getByTestId('error')).toHaveTextContent('err');
  });

  it('reloads when props change / reload called', async () => {
    getTransactions.mockResolvedValue({ data: { data: [], meta: {} } });
    render(<TestComp customerId="c1" />);
    await waitFor(() => expect(getTransactions).toHaveBeenCalled());
  });
});
