import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { registerCustomerApi } from '../../api/authApi';
import { loginUser } from '../../store/authSlice';
import { getPublicPetrolPumps, getAvailablePumps, submitLinkRequest } from '../../api/customerPumpApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Petrol pump selection state
  const [pumps, setPumps] = useState([]);
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [relationshipChoice, setRelationshipChoice] = useState('none'); // 'none' | 'existing_account' | 'new_relationship'
  const [customerCode, setCustomerCode] = useState('');
  const [businessNotes, setBusinessNotes] = useState('');

  const [loadingPumps, setLoadingPumps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPumps = async () => {
      try {
        setLoadingPumps(true);
        let pumpList = [];
        try {
          const pubRes = await getPublicPetrolPumps();
          pumpList = pubRes.data?.data || [];
        } catch {
          const availRes = await getAvailablePumps();
          pumpList = availRes.data?.data || [];
        }
        setPumps(pumpList);
        if (pumpList.length > 0) {
          setSelectedPumpId(pumpList[0]._id);
        }
      } catch {
        // Continue without pumps if offline or empty
      } finally {
        setLoadingPumps(false);
      }
    };
    loadPumps();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (relationshipChoice === 'existing_account' && !customerCode.trim()) {
      setError('Please provide your customer code for the selected petrol pump.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Step 1: Create customer identity (backend enforces role = customer)
      await registerCustomerApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      // Step 2: Auto-authenticate customer session
      try {
        const loginRes = await dispatch(
          loginUser({
            email: formData.email.trim(),
            password: formData.password,
          })
        ).unwrap();

        // Step 3: If customer selected a petrol pump during onboarding, submit link request
        if (loginRes && relationshipChoice !== 'none' && selectedPumpId) {
          try {
            await submitLinkRequest({
              petrolPumpId: selectedPumpId,
              requestType: relationshipChoice,
              requestedCustomerCode:
                relationshipChoice === 'existing_account'
                  ? customerCode.trim().toUpperCase()
                  : undefined,
              requestedPhone: formData.phone.trim(),
              notes: businessNotes.trim() || undefined,
            });
          } catch {
            // Link request warning is recoverable — account was still successfully created
          }
        }

        navigate('/dashboard', { replace: true });
        return;
      } catch {
        // If auto-login fails, redirect cleanly to login screen
        navigate('/login', {
          state: {
            message: 'Registration successful! Please sign in with your email and password.',
          },
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to create customer account. Please try again.'
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
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-md)',
          padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 28px)',
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
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
              <rect x="8" y="22" width="8" height="12" rx="2" fill="white" />
              <rect x="20" y="16" width="8" height="18" rx="2" fill="white" opacity="0.8" />
              <path d="M8 14 L20 8 L32 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
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
            Create Customer Account
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
            One single login to view balances and statements across all your petrol pumps
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
              border: '1px solid color-mix(in oklch, var(--color-error) 24%, transparent)',
              borderRadius: '10px',
              padding: '11px 14px',
              fontSize: '13px',
              color: 'var(--color-error)',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Identity Fields */}
          <Input
            label="Full Name or Business Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Ahmed Khan / Malik Transport"
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="user@example.com"
            />

            <Input
              label="Mobile Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="03001234567"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '14px' }}>
            <Input
              label="Password (min 8 chars)"
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
          </div>

          {/* Petrol Pump Onboarding Selection */}
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)', marginBottom: '4px' }}>
              Connect with a Petrol Pump (Optional)
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
              You can connect to your petrol pump now or connect any time from your customer dashboard.
            </p>

            {pumps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      color: 'var(--color-text)',
                    }}
                  >
                    Select Petrol Pump
                  </label>
                  <select
                    value={selectedPumpId}
                    onChange={(e) => setSelectedPumpId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                  >
                    {pumps.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} {p.city ? `(${p.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      color: 'var(--color-text)',
                    }}
                  >
                    Do you already have a customer account with this petrol pump?
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                      }}
                    >
                      <input
                        type="radio"
                        name="relChoice"
                        value="existing_account"
                        checked={relationshipChoice === 'existing_account'}
                        onChange={() => setRelationshipChoice('existing_account')}
                      />
                      <span>Yes, I already deal with this petrol pump</span>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                      }}
                    >
                      <input
                        type="radio"
                        name="relChoice"
                        value="new_relationship"
                        checked={relationshipChoice === 'new_relationship'}
                        onChange={() => setRelationshipChoice('new_relationship')}
                      />
                      <span>No, I want to request a new customer relationship</span>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <input
                        type="radio"
                        name="relChoice"
                        value="none"
                        checked={relationshipChoice === 'none'}
                        onChange={() => setRelationshipChoice('none')}
                      />
                      <span>I will connect later from the dashboard</span>
                    </label>
                  </div>
                </div>

                {relationshipChoice === 'existing_account' && (
                  <Input
                    label="Customer Code"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    placeholder="e.g. AP-100"
                    required
                  />
                )}

                {relationshipChoice === 'new_relationship' && (
                  <Input
                    label="Business or Fleet Note (Optional)"
                    value={businessNotes}
                    onChange={(e) => setBusinessNotes(e.target.value)}
                    placeholder="e.g. 5 commercial trucks / weekly diesel supply"
                  />
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {loadingPumps ? 'Loading active petrol pumps...' : 'You can connect petrol pumps after logging in.'}
              </div>
            )}
          </div>

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
            Create Customer Account
          </Button>

          <div style={{ textAlign: 'center', fontSize: '13px', marginTop: '6px', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
