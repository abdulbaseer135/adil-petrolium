import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fuel, CheckCircle } from 'lucide-react';
import { registerAdminApi } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function RegisterPetrolPump() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    pumpName: '',
    registrationNumber: '',
    businessPhone: '',
    businessEmail: '',
    city: '',
    province: 'Punjab',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      await registerAdminApi({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        pumpName: formData.pumpName.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to submit registration. Please verify details.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
            maxWidth: 500,
            background: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-default, #E2E8EC)',
            borderRadius: 'var(--radius-xl, 14px)',
            boxShadow: 'var(--shadow-card)',
            padding: '36px 28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-success-bg, #EAF7EF)',
              color: 'var(--color-success, #18864B)',
              border: '1px solid var(--color-success-border, #C8EBD5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckCircle size={32} />
          </div>
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Registration Submitted
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            Your petrol pump registration for <strong>{formData.pumpName}</strong> has been received
            and submitted for approval. Our platform Super Administrator will review your details
            shortly.
          </p>
          <Button onClick={() => navigate('/login')} fullWidth>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg-page, #F5F7F8)',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
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
            Register Petrol Pump
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Submit your petrol pump station for multi-tenant SaaS onboarding
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
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Admin Details Section */}
          <div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: '12px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '6px',
              }}
            >
              1. Administrator Account
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Tariq Mehmood"
              />
              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="admin@station.com"
              />
              <Input
                label="Personal Mobile Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="03001234567"
              />
              <Input
                label="Password (min 8 chars)"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Petrol Pump Details Section */}
          <div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: '12px',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '6px',
              }}
            >
              2. Station & Business Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
              <Input
                label="Petrol Pump Station Name"
                name="pumpName"
                value={formData.pumpName}
                onChange={handleChange}
                required
                placeholder="e.g. Al-Madina Petroleum"
              />
              <Input
                label="Registration / License #"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="OGRA-12345"
              />
              <Input
                label="Station Business Phone"
                name="businessPhone"
                value={formData.businessPhone}
                onChange={handleChange}
                placeholder="04231234567"
              />
              <Input
                label="Station Business Email"
                type="email"
                name="businessEmail"
                value={formData.businessEmail}
                onChange={handleChange}
                placeholder="contact@almadinapetroleum.com"
              />
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="e.g. Faisalabad"
              />
              <Input
                label="Province / Region"
                name="province"
                value={formData.province}
                onChange={handleChange}
                placeholder="e.g. Punjab"
              />
            </div>
            <div style={{ marginTop: '14px' }}>
              <Input
                label="Physical Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder="e.g. Plot 14, Main GT Road, Near Bypass"
              />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            fullWidth
            style={{ minHeight: 46, fontSize: '15px', fontWeight: 600, marginTop: '8px' }}
          >
            Submit Petrol Pump Application
          </Button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
