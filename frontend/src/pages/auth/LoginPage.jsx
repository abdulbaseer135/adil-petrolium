import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Loader = () => (
  <div
    style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--color-bg)',
    }}
  >
    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
      Loading...
    </div>
  </div>
);

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const { user, loading, initialized } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (!initialized || loading) return <Loader />;
  if (user?.role === 'super_admin') return <Navigate to="/super-admin/dashboard" replace />;
  if (user?.role === 'admin') {
    if (user?.status === 'pending') return <Navigate to="/pending-approval" replace />;
    return <Navigate to="/admin" replace />;
  }
  if (user?.role === 'customer') return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    clearError();
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      // Error is tracked in Redux state (error) and displayed in the alert UI below
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
          borderRadius: '18px',
          boxShadow: 'var(--shadow-md)',
          padding: 'clamp(20px, 5vw, 28px) clamp(16px, 5vw, 24px)',
        }}
      >
        {/* Top Header bar with Super Admin Login link */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '20px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Petrol Management System
          </span>
          <Link
            to="/super-admin/login"
            id="top-super-admin-btn"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'var(--color-primary-soft, #EAF5F1)',
              border: '1px solid rgba(11, 93, 75, 0.25)',
            }}
          >
            <span>⚡</span>
            <span>Super Admin</span>
          </Link>
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '30px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              marginTop: '6px',
              marginBottom: 0,
              fontSize: '14px',
              color: 'var(--color-text-muted)',
            }}
          >
            Sign in to access your dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <Input
            label="Email address"
            type="email"
            id="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              style={{
                background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
                border: '1px solid color-mix(in oklch, var(--color-error) 24%, transparent)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '14px',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          ) : null}

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
            Sign in
          </Button>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Station Owner? </span>
              <Link
                to="/signup/petrol-pump"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Register Petrol Pump
              </Link>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Fuel Customer? </span>
              <Link
                to="/signup/customer"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Create Customer Account
              </Link>
            </div>

            {/* Dedicated Super Admin Login Button */}
            <div style={{ marginTop: '12px', paddingTop: '14px', borderTop: '1px solid var(--color-border)' }}>
              <Link
                to="/super-admin/login"
                id="super-admin-login-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(11, 93, 75, 0.3)',
                  background: 'var(--color-primary-soft, #EAF5F1)',
                  color: 'var(--color-primary, #0B5D4B)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <span style={{ fontSize: '15px' }}>⚡</span>
                <span>Super Admin Login</span>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}