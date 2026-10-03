import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Fuel, ShieldCheck } from 'lucide-react';
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
          background: 'var(--bg-page, #F5F7F8)',
        }}
      >
        <div style={{ color: 'var(--text-secondary, #5B6870)', fontSize: '14px' }}>
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
        {/* Header & Branding */}
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
            Initialize Super Admin
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            One-time bootstrap setup for system platform administration
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
              color: 'var(--text-secondary, #5B6870)',
              lineHeight: 1.5,
              background: 'var(--bg-surface-secondary, #F9FAFB)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default, #E2E8EC)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} color="var(--color-primary, #0B5D4B)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Security Note:</strong> Only the predefined email configured on the server
              environment is authorized to complete this one-time initialization.
            </div>
          </div>

          <Button
            type="submit"
            loading={submitting}
            fullWidth
            style={{ marginTop: '4px' }}
          >
            Create Super Admin Account
          </Button>
        </form>
      </div>
    </div>
  );
}
