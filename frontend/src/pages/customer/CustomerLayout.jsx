import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../api/customerApi';
import AppShell from '../../components/layout/AppShell';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'My Account', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/dashboard/statement', label: 'Statement', icon: Receipt },
      { to: '/dashboard/monthly', label: 'Monthly Summary', icon: CalendarDays },
    ],
  },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return undefined;

    const loadProfile = async () => {
      try {
        await getMyProfile();
      } catch (error) {
        // Ignore transient error
      }
    };

    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const contextBadge = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--color-success, #18864B)',
        }}
      />
      <span>Customer Portal</span>
    </span>
  );

  return (
    <AppShell
      role="customer"
      navSections={NAV_SECTIONS}
      user={user}
      onLogout={handleLogout}
      contextBadge={contextBadge}
      notificationTitle="Account & Ledger Alerts"
    />
  );
}