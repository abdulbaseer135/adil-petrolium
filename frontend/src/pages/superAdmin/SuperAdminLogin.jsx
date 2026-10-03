import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function SuperAdminLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const { user, initialized } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (initialized && user) {
    if (user.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'customer') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    clearError();
    setInfoMessage('');
    setSubmitting(true);

    try {
      const res = await login({ email: email.trim(), password });
      if (res?.role === 'super_admin') {
        navigate('/super-admin/dashboard', { replace: true });
      } else if (res?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // Error handled by redux
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--color-bg)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          padding: '32px 26px',
        }}
      >
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'var(--color-primary, #0B5D4B)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
              Petrol Management System
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 6px',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Super Admin Login
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Sign in to access platform-wide governance and station controls
          </p>
        </div>

        {infoMessage && (
          <div
            role="status"
            style={{
              background: 'var(--color-success-soft, #EAF7EF)',
              border: '1px solid rgba(24, 134, 75, 0.25)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--color-success, #18864B)',
              marginBottom: '16px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            ✓ {infoMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
              border: '1px solid color-mix(in oklch, var(--color-error) 24%, transparent)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--color-error)',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Super Admin Email"
            type="email"
            id="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="superadmin@domain.com"
          />

          <Input
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />

          <Button
            type="submit"
            loading={submitting}
            fullWidth
            style={{
              marginTop: '6px',
              justifyContent: 'center',
              minHeight: 44,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Sign in as Super Admin
          </Button>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
            <a
              href="/login"
              style={{
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Back to Regular Login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
