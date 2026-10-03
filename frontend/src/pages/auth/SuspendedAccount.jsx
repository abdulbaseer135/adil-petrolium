import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Ban } from 'lucide-react';
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
        background: 'var(--bg-page, #F5F7F8)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
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
            background: 'var(--color-danger-bg, #FDEEEE)',
            color: 'var(--color-danger, #C64040)',
            border: '1px solid var(--color-danger-border, #F7CACA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Ban size={28} />
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Account Suspended
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
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
            background: 'var(--bg-surface-secondary, #F9FAFB)',
            border: '1px solid var(--border-default, #E2E8EC)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px 16px',
            fontSize: '13px',
            textAlign: 'left',
            color: 'var(--text-secondary)',
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

        <Button onClick={handleLogout} variant="outline" fullWidth>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
