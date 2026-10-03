import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Fuel, ArrowLeft } from 'lucide-react';
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
        background: 'var(--bg-page, #F5F7F8)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-surface, #FFFFFF)',
          border: '1px solid var(--border-default, #E2E8EC)',
          borderRadius: 'var(--radius-xl, 14px)',
          boxShadow: 'var(--shadow-card)',
          padding: '32px 26px',
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
            Super Admin Console
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sign in to access platform-wide governance and station controls
          </p>
        </div>

        {infoMessage && (
          <div
            role="status"
            style={{
              background: 'var(--color-success-bg, #EAF7EF)',
              border: '1px solid var(--color-success-border, #C8EBD5)',
              borderRadius: 'var(--radius-md, 8px)',
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
              background: 'var(--color-danger-bg, #FDEEEE)',
              border: '1px solid var(--color-danger-border, #F7CACA)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '10px 12px',
              fontSize: '13px',
              color: 'var(--color-danger, #C64040)',
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
            style={{ marginTop: '6px' }}
          >
            Sign in to Console
          </Button>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
            <Link
              to="/login"
              style={{
                color: 'var(--text-secondary, #5B6870)',
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Regular Login</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
