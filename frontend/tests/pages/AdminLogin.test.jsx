import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({ login: jest.fn(async () => {}), error: null, clearError: jest.fn() }),
}));

import AdminLogin from '../../../src/pages/auth/AdminLogin';

describe('AdminLogin page', () => {
  it('renders email and password fields and submit button', () => {
    render(<AdminLogin />);
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password or mobile number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot password\? Recover access/i)).toBeInTheDocument();
  });

  it('shows server error message when login fails', async () => {
    const loginMock = jest.fn().mockRejectedValueOnce({ response: { data: { message: 'Invalid' } } });
    jest.doMock('../../../src/hooks/useAuth', () => ({ useAuth: () => ({ login: loginMock, error: 'Invalid', clearError: jest.fn() }) }));
    // Re-require the component to apply mock
    const { default: LocalAdminLogin } = await import('../../../src/pages/auth/LoginPage.jsx');
    render(<LocalAdminLogin />);
    expect(screen.getByText(/Invalid/i)).toBeInTheDocument();
  });
});
