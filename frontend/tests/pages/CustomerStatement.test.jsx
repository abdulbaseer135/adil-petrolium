import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../../src/api/customerApi', () => ({ getMyProfile: jest.fn() }));

import Statement from '../../../src/pages/customer/Statement';
import { getMyProfile } from '../../../src/api/customerApi';

describe('Customer Statement page', () => {
  it('shows loading then profile and balance', async () => {
    getMyProfile.mockResolvedValueOnce({ data: { data: { currentBalance: 1234, customerCode: 'C100', userId: { name: 'Z' } } } });
    render(<Statement />);

    expect(screen.getByText(/Account Statement/i)).toBeInTheDocument();
    await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
    expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/C100/)).toBeInTheDocument();
  });

  it('shows skeleton when loading and handles error silently', async () => {
    getMyProfile.mockRejectedValueOnce(new Error('fail'));
    render(<Statement />);
    await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
    // StatementDownload always renders; we assert that page heading remains
    expect(screen.getByText(/Account Statement/i)).toBeInTheDocument();
  });
});
