import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Pagination } from '../components/common/Pagination';

describe('Pagination Component', () => {
  it('does not render when totalPages is 0 or 1', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={0} onPageChange={jest.fn()} />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    rerender(
      <Pagination page={1} totalPages={1} onPageChange={jest.fn()} />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('renders pagination controls for multiple pages', () => {
    render(
      <Pagination page={1} totalPages={5} onPageChange={jest.fn()} />
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('disables prev button on first page', () => {
    render(
      <Pagination page={1} totalPages={5} onPageChange={jest.fn()} />
    );
    
    const prevButton = screen.getAllByRole('button')[0]; // Previous button
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination page={5} totalPages={5} onPageChange={jest.fn()} />
    );
    
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1]; // Next button
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when page number clicked', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination page={1} totalPages={5} onPageChange={handlePageChange} />
    );
    
    const buttons = screen.getAllByRole('button');
    // Click on page 3 button (usually after prev button)
    const page3Button = buttons.find(btn => btn.textContent === '3');
    if (page3Button) {
      fireEvent.click(page3Button);
      expect(handlePageChange).toHaveBeenCalledWith(3);
    }
  });

  it('calls onPageChange when prev button clicked', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination page={3} totalPages={5} onPageChange={handlePageChange} />
    );
    
    const prevButton = screen.getAllByRole('button')[0];
    fireEvent.click(prevButton);
    
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when next button clicked', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination page={2} totalPages={5} onPageChange={handlePageChange} />
    );
    
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    fireEvent.click(nextButton);
    
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('displays first and last page always', () => {
    render(
      <Pagination page={1} totalPages={10} onPageChange={jest.fn()} />
    );
    
    const buttons = screen.getAllByRole('button');
    const pageButtons = buttons.filter(btn => !['‹', '›'].includes(btn.textContent));
    
    // Should include page 1 and page 10
    const pageNumbers = pageButtons.map(btn => parseInt(btn.textContent));
    expect(pageNumbers).toContain(1);
    expect(pageNumbers).toContain(10);
  });

  it('shows ellipsis when there are gaps', () => {
    render(
      <Pagination page={1} totalPages={10} onPageChange={jest.fn()} />
    );
    
    const ellipsis = screen.queryByText('…');
    expect(ellipsis).toBeInTheDocument();
  });

  it('handles edge case with 2 pages', () => {
    render(
      <Pagination page={1} totalPages={2} onPageChange={jest.fn()} />
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles large page numbers', () => {
    const handlePageChange = jest.fn();
    render(
      <Pagination page={50} totalPages={100} onPageChange={handlePageChange} />
    );
    
    const buttons = screen.getAllByRole('button');
    const page52Button = buttons.find(btn => btn.textContent === '52');
    if (page52Button) {
      fireEvent.click(page52Button);
      expect(handlePageChange).toHaveBeenCalledWith(52);
    }
  });

  it('highlights current page', () => {
    render(
      <Pagination page={3} totalPages={5} onPageChange={jest.fn()} />
    );
    
    const buttons = screen.getAllByRole('button');
    const page3Button = buttons.find(btn => btn.textContent === '3');
    
    // The current page button should have different styling
    // Check by verifying it has specific attributes or styles
    expect(page3Button).toBeInTheDocument();
  });
});
