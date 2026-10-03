import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logoutUser, clearError } from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((s) => s.auth);

  const login = useCallback(
    async (credentials) => {
      const action = await dispatch(loginUser(credentials));
      if (loginUser.fulfilled.match(action)) {
        return action.payload;
      }
      throw new Error(action.payload || 'Login failed');
    },
    [dispatch]
  );
  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);
  const clearAuthError = useCallback(() => dispatch(clearError()), [dispatch]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    clearError: clearAuthError,
  };
};