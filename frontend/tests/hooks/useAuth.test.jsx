import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { useAuth } from '../../../src/hooks/useAuth';

function TestComponent() {
  const { user, loading, error } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error || ''}</div>
    </div>
  );
}

describe('useAuth hook', () => {
  it('shows unauthenticated state', () => {
    const store = configureStore({ reducer: { auth: (s = { user: null, loading: false, error: null }) => s } });
    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('shows authenticated state', () => {
    const store = configureStore({ reducer: { auth: (s = { user: { email: 'a@x' }, loading: false, error: null }) => s } });
    render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('a@x');
  });
});
