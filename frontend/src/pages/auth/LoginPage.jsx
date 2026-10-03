import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Fuel, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Loader = () => (
  <div
    style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--bg-page, #F5F7F8)',
    }}
  >
    <div style={{ color: 'var(--text-muted, #7A878E)', fontSize: '14px' }}>
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
    } catch {
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
        background: 'var(--bg-page, #F5F7F8)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-surface, #FFFFFF)',
          border: '1px solid var(--border-default, #E2E8EC)',
          borderRadius: 'var(--radius-xl, 14px)',
          boxShadow: 'var(--shadow-card)',
          padding: '32px 28px',
        }}
      >
        {/* Brand Block */}
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
            Welcome back
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            Sign in to access your portal
          </p>
        </div>

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
            placeholder="you@domain.com"
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
            }}
          >
            Sign in
          </Button>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Station Owner? </span>
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
              <span style={{ color: 'var(--text-secondary)' }}>Fuel Customer? </span>
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
            <div style={{ marginTop: '12px', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
              <Link
                to="/super-admin/login"
                id="super-admin-login-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface-secondary, #F9FAFB)',
                  color: 'var(--text-secondary, #5B6870)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <ShieldCheck size={16} color="var(--color-primary)" />
                <span>Super Admin Console</span>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}