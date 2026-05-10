import React, { useState, useEffect } from 'react';
import { adminChangePassword } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';

const AdminProfile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMatch, setPasswordMatch] = useState(null);

  useEffect(() => {
    if (formData.newPassword && formData.confirmPassword) {
      setPasswordMatch(formData.newPassword === formData.confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [formData.newPassword, formData.confirmPassword]);

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await adminChangePassword({
        oldPassword: formData.oldPassword.trim(),
        newPassword: formData.newPassword.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      });

      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.oldPassword && formData.newPassword && formData.confirmPassword && passwordMatch;

  return (
    <div className="form-page" style={{ padding: 'var(--space-6)', maxWidth: '960px', margin: '0 auto' }}>
      <div className="form-hero">
        <div className="form-hero__titleGroup">
          <h1 className="form-hero__title">Admin Profile</h1>
          <p className="form-hero__subtitle">Review your account details and update the password used for admin access.</p>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-surface form-surface--padded">
          <div className="form-section__header">
            <div>
              <div className="form-section__title">Profile Information</div>
              <div className="form-section__subtitle">Read-only account details for the current admin session.</div>
            </div>
          </div>
          <div className="form-section" style={{ marginTop: 'var(--space-4)' }}>
            <div>
              <label className="form-field__label">Email</label>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="form-field__label">Role</label>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>{user?.role || 'N/A'}</p>
            </div>
            <div>
              <label className="form-field__label">Last Login</label>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="form-surface form-surface--padded">
          <div className="form-section__header">
            <div>
              <div className="form-section__title">Change Password</div>
              <div className="form-section__subtitle">Use a strong password and confirm it before saving.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-section" style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label="Current Password"
              type="password"
              id="oldPassword"
              autoComplete="current-password"
              value={formData.oldPassword}
              onChange={handleInputChange('oldPassword')}
              required
            />

            <Input
              label="New Password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              minLength={6}
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              minLength={6}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
            />

            {passwordMatch !== null && (
              <div className="form-note" style={{ color: passwordMatch ? 'var(--color-success)' : 'var(--color-error)' }}>
                {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            {error && (
              <div style={{
                background: 'color-mix(in oklch, var(--color-error) 8%, var(--color-surface))',
                color: 'var(--color-error)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in oklch, var(--color-error) 20%, var(--color-divider))',
                fontSize: 'var(--text-sm)',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'color-mix(in oklch, var(--color-success) 8%, var(--color-surface))',
                color: 'var(--color-success)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in oklch, var(--color-success) 20%, var(--color-divider))',
                fontSize: 'var(--text-sm)',
              }}>
                {success}
              </div>
            )}

            <div className="form-actions--stacked" style={{ marginTop: 'var(--space-2)' }}>
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;