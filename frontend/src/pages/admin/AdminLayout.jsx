import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Link2,
  Fuel,
  CreditCard,
  Calendar,
  CalendarDays,
  TrendingUp,
  Download,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../components/layout/AppShell';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/customer-requests', label: 'Link Requests', icon: Link2 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/fuel-entry', label: 'Fuel Entry', icon: Fuel },
      { to: '/admin/transactions', label: 'Transactions', icon: CreditCard },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/admin/daily-record', label: 'Daily Record', icon: Calendar },
      { to: '/admin/monthly-report', label: 'Monthly', icon: CalendarDays },
      { to: '/admin/yearly-report', label: 'Yearly', icon: TrendingUp },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/exports', label: 'Export Center', icon: Download },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/admin/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const helpContent = {
    title: 'Station Help & Documentation',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', color: 'var(--text-secondary, #5B6870)', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          Welcome to the <strong>Petrol Management System</strong> Station Admin Portal. You can record daily fuel sales, manage customer credit limits, reconcile payments, and export financial summaries.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface-secondary, #F9FAFB)', borderRadius: '8px', border: '1px solid var(--border-default, #E2E8EC)' }}>
            <strong style={{ color: 'var(--text-primary, #17242D)' }}>Recording Fuel Sales:</strong> Navigate to <em>Fuel Entry</em>, select the customer account, enter litres, rate, and save.
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface-secondary, #F9FAFB)', borderRadius: '8px', border: '1px solid var(--border-default, #E2E8EC)' }}>
            <strong style={{ color: 'var(--text-primary, #17242D)' }}>Customer Payments:</strong> Open <em>Transactions</em>, click <em>Receive Payment</em>, specify amount and receipt reference.
          </div>
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface-secondary, #F9FAFB)', borderRadius: '8px', border: '1px solid var(--border-default, #E2E8EC)' }}>
            <strong style={{ color: 'var(--text-primary, #17242D)' }}>Reports & Exports:</strong> Visit <em>Export Center</em> to generate formatted daily, monthly, or yearly Excel workbooks.
          </div>
        </div>
      </div>
    ),
  };

  return (
    <AppShell
      role="admin"
      navSections={NAV_SECTIONS}
      user={user}
      onLogout={handleLogout}
      searchQuery={searchQuery}
      onSearchChange={(e) => setSearchQuery(e.target.value)}
      onSearchSubmit={handleSearchSubmit}
      searchPlaceholder="Search customers, transactions, or pages..."
      notificationTitle="Pending link requests and station alerts"
      helpContent={helpContent}
    />
  );
}
