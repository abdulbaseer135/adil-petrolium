import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getSuperAdminSetupStatusApi, setupSuperAdminApi } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function SuperAdminSetup() {
  const navigate = useNavigate();
  const { user, initialized } = useSelector((s) => s.auth);

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [setupRequired, setSetupRequired] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const verifyStatus = async () => {
      try {
        setCheckingStatus(true);
        const res = await getSuperAdminSetupStatusApi();
        if (isMounted) {
          const req = res.data?.data?.setupRequired ?? false;
          setSetupRequired(req);
        }
      } catch {
        if (isMounted) {
          setSetupRequired(false);
        }
      } finally {
        if (isMounted) {
          setCheckingStatus(false);
        }
      }
    };

    verifyStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (initialized && user?.role === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  if (checkingStatus) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg)',
        }}
      >
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Verifying setup availability...
        </div>
      </div>
    );
  }

  // If Super Admin is already initialized, setup is not allowed; redirect to login
  if (!setupRequired) {
    return <Navigate to="/super-admin/login" replace />;
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);

    try {
      await setupSuperAdminApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      // Redirect to Super Admin login with success message
      navigate('/super-admin/login', {
        state: { message: 'Super Admin account created successfully. Please sign in.' },
        replace: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to initialize Super Admin account. Please try again.'
      );
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
          maxWidth: 440,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          padding: '32px 28px',
        }}
      >
        {/* Header & Branding */}
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
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
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
            Initialize Super Admin
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
            One-time bootstrap setup for system platform administration
          </p>
        </div>

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
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Platform Administrator"
          />

          <Input
            label="Authorized Super Admin Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="authorized-email@domain.com"
          />

          <Input
            label="Master Password (min 8 chars)"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="••••••••"
          />

          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              background: 'var(--color-bg)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            🔒 <strong>Security Note:</strong> Only the predefined email configured on the server
            environment is authorized to complete this one-time initialization.
          </div>

          <Button
            type="submit"
            loading={submitting}
            fullWidth
            style={{
              marginTop: '4px',
              justifyContent: 'center',
              minHeight: 44,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Create Super Admin Account
          </Button>
        </form>
      </div>
    </div>
  );
}
