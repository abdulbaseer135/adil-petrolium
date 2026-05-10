import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { DateRangeFilter } from '../../../src/components/common/DateRangeFilter';

describe('DateRangeFilter', () => {
  it('applies preset day/month/year and calls onFilter', () => {
    const onFilter = jest.fn();
    render(<DateRangeFilter onFilter={onFilter} />);

    userEvent.click(screen.getByRole('button', { name: /Today/i }));
    expect(onFilter).toHaveBeenCalled();

    userEvent.click(screen.getByRole('button', { name: /This month/i }));
    expect(onFilter).toHaveBeenCalled();

    userEvent.click(screen.getByRole('button', { name: /This year/i }));
    expect(onFilter).toHaveBeenCalled();
  });

  it('applies custom range and validates empty/invalid inputs', () => {
    const onFilter = jest.fn();
    const { container } = render(<DateRangeFilter onFilter={onFilter} />);

    // Locate date inputs by type to avoid role ambiguity
    const inputs = container.querySelectorAll('input[type="date"]');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    const [start, end] = inputs;
    userEvent.type(start, '2023-01-01');
    userEvent.type(end, '2023-01-10');

    userEvent.click(screen.getByRole('button', { name: /Apply/i }));
    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ startDate: expect.any(String), endDate: expect.any(String) }));
  });
});
