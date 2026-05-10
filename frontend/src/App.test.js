import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import App from './App';

// Mock fetchMe thunk so App's useEffect won't perform network calls during tests
jest.mock('./store/authSlice', () => ({
  fetchMe: () => ({ type: 'TEST_FETCH_ME' }),
  loginUser: () => ({ type: 'TEST_LOGIN' }),
  logoutUser: () => ({ type: 'TEST_LOGOUT' }),
  clearError: () => ({ type: 'TEST_CLEAR_ERROR' }),
}));

const createStore = (state = {}) =>
  configureStore({
    reducer: { auth: (s = state, a) => s },
  });

describe('App routing and public routes', () => {
  it('renders login page when unauthenticated and /login is loaded', () => {
    const store = createStore({ user: null, loading: false, initialized: true });
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // The login page includes heading 'Welcome back'
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
