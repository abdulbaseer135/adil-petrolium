import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'a@x.com', role: 'admin' } }),
}));

jest.mock('../../../src/api/authApi', () => ({
  adminChangePassword: jest.fn(),
}));

import AdminProfile from '../../../src/pages/admin/AdminProfile';
import { adminChangePassword } from '../../../src/api/authApi';

describe('AdminProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders profile info and password form', () => {
    render(<AdminProfile />);
    expect(screen.getByText(/Admin Profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
  });

  it('validates password mismatch and shows message', async () => {
    render(<AdminProfile />);
    userEvent.type(screen.getByLabelText(/Current Password/i), 'oldpass');
    userEvent.type(screen.getByLabelText(/New Password/i), 'abc123');
    userEvent.type(screen.getByLabelText(/Confirm New Password/i), 'xyz');
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Password/i })).toBeDisabled();
  });

  it('submits password change successfully', async () => {
    adminChangePassword.mockResolvedValueOnce({ data: {} });
    render(<AdminProfile />);
    userEvent.type(screen.getByLabelText(/Current Password/i), 'oldpass');
    userEvent.type(screen.getByLabelText(/New Password/i), 'abc123');
    userEvent.type(screen.getByLabelText(/Confirm New Password/i), 'abc123');
    userEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    await waitFor(() => expect(adminChangePassword).toHaveBeenCalled());
    expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument();
  });

  it('shows API error on wrong old password', async () => {
    adminChangePassword.mockRejectedValueOnce({ response: { data: { message: 'Wrong old password' } } });
    render(<AdminProfile />);
    userEvent.type(screen.getByLabelText(/Current Password/i), 'bad');
    userEvent.type(screen.getByLabelText(/New Password/i), 'abc123');
    userEvent.type(screen.getByLabelText(/Confirm New Password/i), 'abc123');
    userEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    expect(await screen.findByText(/Wrong old password/i)).toBeInTheDocument();
  });
});
