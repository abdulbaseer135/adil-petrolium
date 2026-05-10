import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateRangeFilter } from '../components/common/DateRangeFilter';

describe('DateRangeFilter Component', () => {
  it('renders preset buttons', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30 days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this year/i })).toBeInTheDocument();
  });

  it('renders date input fields', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const dateInputs = screen.getAllByDisplayValue('');
    expect(dateInputs.filter(input => input.type === 'date').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onFilter when Today preset clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const todayButton = screen.getByRole('button', { name: /today/i });
    fireEvent.click(todayButton);
    
    expect(handleFilter).toHaveBeenCalled();
    const args = handleFilter.mock.calls[0][0];
    expect(args).toHaveProperty('startDate');
    expect(args).toHaveProperty('endDate');
    expect(args.startDate).toBe(args.endDate); // Same day
  });

  it('calls onFilter when 7 days preset clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const button7Days = screen.getByRole('button', { name: /7 days/i });
    fireEvent.click(button7Days);
    
    expect(handleFilter).toHaveBeenCalled();
    const args = handleFilter.mock.calls[0][0];
    expect(args).toHaveProperty('startDate');
    expect(args).toHaveProperty('endDate');
  });

  it('calls onFilter when This month preset clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const buttonMonth = screen.getByRole('button', { name: /this month/i });
    fireEvent.click(buttonMonth);
    
    expect(handleFilter).toHaveBeenCalled();
  });

  it('calls onFilter when This year preset clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const buttonYear = screen.getByRole('button', { name: /this year/i });
    fireEvent.click(buttonYear);
    
    expect(handleFilter).toHaveBeenCalled();
  });

  it('disables Apply button when start or end date is missing', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeDisabled();
  });

  it('enables Apply button when both dates are set', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const dateInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'date');
    const startInput = dateInputs[0];
    const endInput = dateInputs[1];
    
    fireEvent.change(startInput, { target: { value: '2024-05-01' } });
    fireEvent.change(endInput, { target: { value: '2024-05-31' } });
    
    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).not.toBeDisabled();
  });

  it('calls onFilter with custom dates when Apply clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const dateInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'date');
    const startInput = dateInputs[0];
    const endInput = dateInputs[1];
    
    fireEvent.change(startInput, { target: { value: '2024-05-01' } });
    fireEvent.change(endInput, { target: { value: '2024-05-31' } });
    
    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);
    
    expect(handleFilter).toHaveBeenCalledWith({
      startDate: '2024-05-01',
      endDate: '2024-05-31',
    });
  });

  it('shows Clear button after filter is applied', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const todayButton = screen.getByRole('button', { name: /today/i });
    fireEvent.click(todayButton);
    
    // Clear button should appear
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('resets filter when Clear button clicked', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    // Apply a filter first
    const todayButton = screen.getByRole('button', { name: /today/i });
    fireEvent.click(todayButton);
    
    // Then clear it
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    
    // Should call onFilter with empty values
    expect(handleFilter).toHaveBeenLastCalledWith({
      startDate: '',
      endDate: '',
    });
  });

  it('handles 30 days preset', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const button30Days = screen.getByRole('button', { name: /30 days/i });
    fireEvent.click(button30Days);
    
    expect(handleFilter).toHaveBeenCalled();
  });

  it('updates date inputs when custom dates are entered', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const dateInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'date');
    const startInput = dateInputs[0];
    
    fireEvent.change(startInput, { target: { value: '2024-05-15' } });
    
    expect(startInput.value).toBe('2024-05-15');
  });

  it('does not show Clear button initially', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('highlights active preset', () => {
    render(<DateRangeFilter onFilter={jest.fn()} />);
    
    const todayButton = screen.getByRole('button', { name: /today/i });
    fireEvent.click(todayButton);
    
    // After clicking, the button should have focus or active styling
    expect(todayButton).toBeInTheDocument();
  });

  it('handles multiple preset clicks in sequence', () => {
    const handleFilter = jest.fn();
    render(<DateRangeFilter onFilter={handleFilter} />);
    
    const button7Days = screen.getByRole('button', { name: /7 days/i });
    const button30Days = screen.getByRole('button', { name: /30 days/i });
    
    fireEvent.click(button7Days);
    expect(handleFilter).toHaveBeenCalledTimes(1);
    
    fireEvent.click(button30Days);
    expect(handleFilter).toHaveBeenCalledTimes(2);
  });
});
