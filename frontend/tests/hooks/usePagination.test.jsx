import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { usePagination } from '../../../src/hooks/usePagination';

function TestComp() {
  const { page, limit, goTo, reset, setLimit } = usePagination(10);
  return (
    <div>
      <div data-testid="page">{page}</div>
      <div data-testid="limit">{limit}</div>
      <button onClick={() => goTo(3)}>go3</button>
      <button onClick={() => reset()}>reset</button>
      <button onClick={() => setLimit(25)}>setLimit</button>
    </div>
  );
}

describe('usePagination', () => {
  it('navigates pages and resets', () => {
    render(<TestComp />);
    expect(screen.getByTestId('page')).toHaveTextContent('1');
    userEvent.click(screen.getByText('go3'));
    expect(screen.getByTestId('page')).toHaveTextContent('3');
    userEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('page')).toHaveTextContent('1');
    userEvent.click(screen.getByText('setLimit'));
    expect(screen.getByTestId('limit')).toHaveTextContent('25');
  });
});
