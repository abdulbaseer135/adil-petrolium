import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BalanceCard } from '../../../src/components/customer/BalanceCard';

describe('BalanceCard', () => {
  it('renders positive (debt) balance correctly', () => {
    render(<BalanceCard balance={1500.5} customerCode="CUST-1" name="Alice" />);
    expect(screen.getByTestId('balance-amount')).toHaveTextContent(/PKR/);
    // positive balance treated as amount due
    expect(screen.getByText(/Amount due/i)).toBeInTheDocument();
  });

  it('renders zero balance as cleared', () => {
    render(<BalanceCard balance={0} customerCode="CUST-2" />);
    expect(screen.getByTestId('balance-amount')).toHaveTextContent(/PKR/);
    expect(screen.getByText(/Account cleared/i)).toBeInTheDocument();
  });

  it('renders negative (credit) balance correctly', () => {
    render(<BalanceCard balance={-250.25} customerCode="CUST-3" />);
    expect(screen.getByTestId('balance-amount')).toHaveTextContent(/PKR/);
    // negative balance shows credit/advance label
    expect(screen.getByText(/Credit balance|Advance credit balance|Credit/i)).toBeInTheDocument();
  });
});
