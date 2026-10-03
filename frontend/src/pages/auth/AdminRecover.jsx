import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fuel } from 'lucide-react';
import { recoverAdminPassword } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
// No longer show recovery keys in the UI — backend issues keys via secure channels

export default function AdminRecover() {
  const [email, setEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await recoverAdminPassword({
        email: email.trim(),
        recoveryKey: recoveryKey.trim(),
        newPassword,
      });

      // Backend now issues recovery keys via secure channels and does not return them in responses
      setSuccess(true);
      setEmail('');
      setRecoveryKey('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-page, #F5F7F8)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-surface, #FFFFFF)',
          border: '1px solid var(--border-default, #E2E8EC)',
          borderRadius: 'var(--radius-xl, 14px)',
          boxShadow: 'var(--shadow-card)',
          padding: '32px 28px',
        }}
      >
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-primary, #0B5D4B)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(11, 93, 75, 0.35)',
              }}
            >
              <Fuel size={20} strokeWidth={2.4} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Petrol Management
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 6px',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Recover Password
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Enter your admin email, current recovery key, and a new password to rotate access.
          </p>
        </div>

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              role="status"
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-success-border, #C8EBD5)',
                background: 'var(--color-success-bg, #EAF7EF)',
                color: 'var(--color-success, #18864B)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Password reset successful. The new recovery key has been issued via a secure channel.
            </div>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 40,
                padding: '0 16px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-primary, #0B5D4B)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Email address"
              type="email"
              id="admin-recover-email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@station.com"
            />

            <Input
              label="Recovery key"
              type="text"
              id="admin-recover-key"
              autoComplete="one-time-code"
              placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              required
              hint="Format: XXXXXX-XXXXXX-XXXXXX-XXXXXX"
            />

            <Input
              label="New password"
              type="password"
              id="admin-recover-password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            {error && (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  background: 'var(--color-danger-bg, #FDEEEE)',
                  border: '1px solid var(--color-danger-border, #F7CACA)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: 'var(--color-danger, #C64040)',
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              style={{ marginTop: '4px' }}
            >
              Reset Password
            </Button>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}