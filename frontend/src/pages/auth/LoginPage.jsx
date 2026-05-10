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
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'customer') return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    clearError();
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
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
          maxWidth: 380,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          padding: '28px 22px',
        }}
      >
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              marginTop: '8px',
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
            label="Password or mobile number"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Enter your password, or use your mobile number here if you forgot the password.
            The mobile number comparison ignores common formatting differences.
          </div>

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
            }}
          >
            Sign in
          </Button>

          <div style={{ textAlign: 'center', marginTop: 2 }}>
            <Link
              to="/admin/recover"
              style={{
                fontSize: 13,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Forgot password? Recover access
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}