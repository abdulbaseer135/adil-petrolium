import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/authSlice';
import { Button } from '../../components/ui/Button';
import NotificationBell from '../../components/common/NotificationBell';

const NAV = [
  { to: '/super-admin/dashboard', label: 'Dashboard', icon: '📊', end: true },
  { to: '/super-admin/petrol-pumps', label: 'Petrol Pumps', icon: '⛽' },
  { to: '/super-admin/admins', label: 'Station Admins', icon: '👤' },
  { to: '/super-admin/customers', label: 'Global Customers', icon: '👥' },
  { to: '/super-admin/audit-logs', label: 'Platform Audit Logs', icon: '🛡️' },
];

export default function SuperAdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/super-admin');
  };

  return (
    <div className="super-admin-shell">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="super-admin-backdrop"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`super-admin-sidebar ${collapsed ? 'collapsed' : ''} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand header */}
        <div className="super-admin-brand">
          <div className="super-admin-brand-icon">
            ⚡
          </div>
          <div className="super-admin-brand-text">
            <div className="super-admin-brand-title">
              Petrol Management System
            </div>
            <div className="super-admin-brand-badge">
              Super Admin
            </div>
          </div>
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="super-admin-collapse-btn desktop-only"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            title="Close menu"
            className="super-admin-collapse-btn mobile-only"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation links */}
        <nav className="super-admin-nav">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `super-admin-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="super-admin-nav-icon">{icon}</span>
              <span className="super-admin-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile & sign out */}
        <div className="super-admin-footer">
          <div className="super-admin-user">
            <div className="super-admin-avatar">
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="super-admin-user-info">
              <div className="super-admin-user-name">
                {user?.name || 'Super Admin'}
              </div>
              <div className="super-admin-user-email">
                {user?.email}
              </div>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="super-admin-signout-btn"
          >
            🚪 <span className="super-admin-nav-label">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="super-admin-main-wrap">
        {/* Responsive Top Header */}
        <header className="super-admin-topbar">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="super-admin-menu-toggle mobile-only"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            ☰
          </button>

          <div className="super-admin-topbar-title">
            <span className="super-admin-topbar-eyebrow">Enterprise Platform</span>
            <span className="super-admin-topbar-heading">Super Admin Console</span>
          </div>

          <div className="super-admin-topbar-right">
            <NotificationBell title="Platform & Registration Alerts" />
            <div className="super-admin-status-pill">
              <span className="status-live-dot" />
              <span>Multi-Tenant Online</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="super-admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
