import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../api/customerApi';
import NotificationBell from '../../components/common/NotificationBell';

const NAV = [
  { to: '/dashboard',          label: 'My Account',    icon: '🏠', end: true },
  { to: '/dashboard/statement',label: 'Statement',     icon: '🧾' },
  { to: '/dashboard/monthly',  label: 'Monthly',       icon: '📅' },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <header className="customer-header">
        <div className="customer-header-top">
          <svg className="customer-header-logo" width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--color-primary)" />
            <rect x="8" y="22" width="8" height="12" rx="2" fill="white" />
            <rect x="20" y="16" width="8" height="18" rx="2" fill="white" opacity="0.8" />
            <path d="M8 14 L20 8 L32 14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="customer-header-brand">Petrol Management System</span>
          <button
            className="customer-mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
        </div>
        
        {menuOpen && (
          <div className="customer-mobile-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        )}
        
        <div className={`customer-header-content ${menuOpen ? 'open' : ''}`}>
          <div className="customer-drawer-top">
            <span className="customer-drawer-title">Menu</span>
            <button
              className="customer-drawer-close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>
          <nav className="customer-header-nav">
            {NAV.map(({ to, label, icon, end }) => (
              <NavLink 
                key={to} 
                to={to} 
                end={end} 
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="customer-nav-icon">{icon}</span> 
                <span className="customer-nav-label">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="customer-header-actions">
            <NotificationBell title="Account & Ledger Alerts" />
            <span className="customer-user-name">{user?.name}</span>
            <button onClick={async () => { await logout(); nav('/login'); }} className="customer-signout-btn">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 'var(--content-wide)', margin: '0 auto', padding: 'clamp(var(--space-3), 3vw, var(--space-5))' }}>
        <Outlet />
      </main>
    </div>
  );
}