import React, { useState, useEffect } from 'react';
import { adminChangePassword } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
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
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Admin Profile"
        subtitle="Review your account details and update credentials used for admin access."
        actions={<Badge variant="primary">{user?.role?.toUpperCase() || 'STATION ADMIN'}</Badge>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Card title="Profile Information" subtitle="Read-only account details for the current admin session.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {user?.email || 'N/A'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role & Permissions
              </label>
              <p style={{ margin: '4px 0 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {user?.role || 'N/A'}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last Login Session
              </label>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Change Password" subtitle="Use a strong password and confirm it before saving.">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Current Password"
              type="password"
              id="oldPassword"
              autoComplete="current-password"
              value={formData.oldPassword}
              onChange={handleInputChange('oldPassword')}
              required
              placeholder="••••••••"
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
              placeholder="••••••••"
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
              placeholder="••••••••"
            />

            {passwordMatch !== null && (
              <div style={{ fontSize: '13px', fontWeight: 500, color: passwordMatch ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            {error && (
              <div style={{
                background: 'var(--color-danger-bg, #FDEEEE)',
                color: 'var(--color-danger, #C64040)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-danger-border, #F7CACA)',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                background: 'var(--color-success-bg, #EAF7EF)',
                color: 'var(--color-success, #18864B)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-success-border, #C8EBD5)',
                fontSize: '13px',
              }}>
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || loading}
              loading={loading}
              fullWidth
              style={{ marginTop: '4px' }}
            >
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminProfile;