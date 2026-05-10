import authReducer, { setLoggedOut, clearError } from '../../../src/store/authSlice';

describe('authSlice reducer', () => {
  const initialState = { user: null, loading: true, error: null, initialized: false };

  it('handles setLoggedOut', () => {
    const next = authReducer({ user: { email: 'a' }, loading: true, initialized: false, error: 'x' }, setLoggedOut());
    expect(next.user).toBeNull();
    expect(next.initialized).toBe(true);
    expect(next.loading).toBe(false);
  });

  it('handles clearError', () => {
    const next = authReducer({ ...initialState, error: 'e' }, clearError());
    expect(next.error).toBeNull();
  });
});
