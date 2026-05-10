import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../api/customerApi';

const NAV = [
  { to: '/dashboard',          label: 'My Account',    icon: '🏠', end: true },
  { to: '/dashboard/statement',label: 'Statement',     icon: '🧾' },
  { to: '/dashboard/monthly',  label: 'Monthly',       icon: '📅' },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return undefined;

    const loadProfile = async () => {
      try {
        await getMyProfile();
      } catch (error) {
        // Ignore transient errors on initial load.
      }
    };

    loadProfile();
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <header style={{ background: 'var(--color-sidebar-bg)', color: '#fff',
        padding: '0 var(--space-6)', height: 'var(--topbar-height)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        position: 'sticky', top: 0, zIndex: 100 }}>
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
          <rect x="8" y="22" width="8" height="12" rx="2" fill="white" />
          <rect x="20" y="16" width="8" height="18" rx="2" fill="white" opacity="0.8" />
          <path d="M8 14 L20 8 L32 14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>Adil Petroleum</span>
        <nav style={{ display: 'flex', gap: 'var(--space-1)', flex: 1 }}>
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px var(--space-3)', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)', textDecoration: 'none',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'var(--color-sidebar-text)',
              background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
              transition: 'all var(--transition)',
            })}>
              {icon} {label}
            </NavLink>
          ))}
        </nav>
        <span style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>{user?.name}</span>
        <button onClick={async () => { await logout(); nav('/login'); }}
          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-sidebar-text)',
            background: 'rgba(255,255,255,0.1)', border: 'none', padding: '6px var(--space-3)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
          Sign out
        </button>
      </header>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <Outlet />
      </main>
    </div>
  );
}