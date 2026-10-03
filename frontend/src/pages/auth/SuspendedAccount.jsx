import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/authSlice';
import { Button } from '../../components/ui/Button';

export default function SuspendedAccount() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
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
          maxWidth: 480,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-md)',
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-danger-soft, #FDEEEE)',
            color: 'var(--color-danger, #C64040)',
            border: '1px solid rgba(198, 64, 64, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 20px',
          }}
        >
          🚫
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          Account Suspended
        </h1>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          Your account or associated petrol pump station has been temporarily suspended by the platform
          Super Administration.
        </p>

        <div
          style={{
            background: 'var(--color-surface-secondary, #F9FAFB)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '14px 16px',
            fontSize: '13px',
            textAlign: 'left',
            color: 'var(--color-text-muted)',
            marginBottom: '24px',
          }}
        >
          <div>
            <strong>Account:</strong> {user?.email}
          </div>
          <div style={{ marginTop: '4px' }}>
            <strong>Action Required:</strong> Please contact system support or your platform
            administrator for compliance and reactivation inquiries.
          </div>
        </div>

        <Button onClick={handleLogout} variant="secondary" fullWidth style={{ minHeight: 42 }}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
