import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BalanceCard } from '../components/customer/BalanceCard';

describe('BalanceCard', () => {
  it('renders positive balance (debt) with amount due message', () => {
    render(<BalanceCard balance={5000} customerCode="CUST-0001" />);
    const el = screen.getByTestId('balance-amount');
    expect(el).toHaveTextContent('5,000');
    expect(screen.getByText(/Amount due/)).toBeInTheDocument();
  });

  it('renders zero balance as cleared with success message', () => {
    render(<BalanceCard balance={0} customerCode="CUST-0001" />);
    expect(screen.getByText(/Account cleared/)).toBeInTheDocument();
  });

  it('shows customer code', () => {
    render(<BalanceCard balance={1000} customerCode="CUST-0042" />);
    expect(screen.getByText(/CUST-0042/)).toBeInTheDocument();
  });

  it('displays customer name when provided', () => {
    render(<BalanceCard balance={1000} customerCode="CUST-001" name="Ali Petroleum" />);
    expect(screen.getByText(/Ali Petroleum/)).toBeInTheDocument();
  });
});
