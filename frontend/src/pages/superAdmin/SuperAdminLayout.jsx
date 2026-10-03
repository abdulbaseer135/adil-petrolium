import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Fuel,
  UserCheck,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { logoutUser } from '../../store/authSlice';
import AppShell from '../../components/layout/AppShell';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/super-admin/petrol-pumps', label: 'Petrol Pumps', icon: Fuel },
      { to: '/super-admin/admins', label: 'Station Admins', icon: UserCheck },
      { to: '/super-admin/customers', label: 'Global Customers', icon: Users },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    ],
  },
];

export default function SuperAdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/super-admin');
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
      <span>Multi-Tenant Online</span>
    </span>
  );

  return (
    <AppShell
      role="super_admin"
      navSections={NAV_SECTIONS}
      user={user}
      onLogout={handleLogout}
      contextBadge={contextBadge}
      notificationTitle="Platform & Registration Alerts"
    />
  );
}
