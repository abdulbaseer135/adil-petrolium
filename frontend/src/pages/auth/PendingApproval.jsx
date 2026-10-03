import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { logoutUser } from '../../store/authSlice';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function PendingApproval() {
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
            background: 'var(--color-warning-bg, #FFF8EC)',
            color: 'var(--color-warning, #C47B12)',
            border: '1px solid var(--color-warning-border, #FDE6B8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Clock size={28} />
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Registration Pending Approval
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          Welcome, <strong>{user?.name || 'Administrator'}</strong>. Your petrol pump registration has been
          submitted and is currently waiting for review and approval by a Super Administrator.
        </p>

        <div
          style={{
            background: 'var(--bg-surface-secondary, #F9FAFB)',
            border: '1px solid var(--border-default, #E2E8EC)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px 16px',
            fontSize: '13px',
            textAlign: 'left',
            color: 'var(--text-secondary, #5B6870)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>Status:</strong>
            <Badge variant="warning">Pending Approval</Badge>
          </div>
          <div>
            <strong>Email:</strong> {user?.email}
          </div>
          <div>
            <strong>Access:</strong> Administrative functionality is restricted until approved.
          </div>
        </div>

        <Button onClick={handleLogout} variant="outline" fullWidth>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
