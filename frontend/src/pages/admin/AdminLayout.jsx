import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/common/NotificationBell';
import '../../styles/adminDashboard.css';

const NAV = [
  { to: '/admin',                   label: 'Overview',      icon: '🏠', end: true },
  { to: '/admin/customers',         label: 'Customers',     icon: '👥' },
  { to: '/admin/customer-requests', label: 'Link Requests', icon: '🔗' },
  { to: '/admin/fuel-entry',        label: 'Fuel Entry',    icon: '⛽' },
  { to: '/admin/transactions',      label: 'Transactions', icon: '💳' },
  { to: '/admin/daily-record',      label: 'Daily Record', icon: '📅' },
  { to: '/admin/monthly-report',    label: 'Monthly',      icon: '📆' },
  { to: '/admin/yearly-report',     label: 'Yearly',       icon: '📈' },
  { to: '/admin/exports',           label: 'Export Center',icon: '⬇'  },
  { to: '/admin/audit-logs',        label: 'Audit Logs',   icon: '🔍' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
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

  // Ctrl+K keyboard shortcut for search focus & Escape key handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (profileDropdownOpen) setProfileDropdownOpen(false);
        if (helpModalOpen) setHelpModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, profileDropdownOpen, helpModalOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    nav(`/admin/transactions?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="admin-shell-modern">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="admin-backdrop"
          aria-hidden="true"
        />
      )}

      {/* Dark Premium Sidebar */}
      <aside
        className={`admin-sidebar-modern ${collapsed ? 'collapsed' : ''} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="admin-brand-header">
          <div className="admin-brand-logo-badge" title="Petrol Management System">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
              <path d="M3 22h12"/>
              <circle cx="9" cy="9" r="2"/>
            </svg>
          </div>
          <div className="admin-brand-text">
            <span className="admin-brand-title">Petrol Management</span>
            <span className="admin-brand-subtitle">Station Admin Portal</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="admin-sidebar-close mobile-only"
            aria-label="Close menu"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="admin-nav-list-modern">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `admin-nav-item-modern ${isActive ? 'active' : ''}`
              }
            >
              <span className="admin-nav-item-icon">{icon}</span>
              <span className="admin-nav-item-text">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Bottom Box */}
        <div className="admin-sidebar-footer-modern">
          <div
            onClick={() => setHelpModalOpen(true)}
            className="admin-help-box"
            role="button"
            tabIndex={0}
            title="Get station support and documentation"
          >
            <div className="admin-help-box-content">
              <div className="admin-help-icon">🎧</div>
              <div>
                <div className="admin-help-title">Need Help?</div>
                <div className="admin-help-desc">Support & Documentation</div>
              </div>
            </div>
            <span className="admin-help-arrow">›</span>
          </div>

          <button
            onClick={handleLogout}
            className="admin-signout-btn"
            title="Sign out of Admin Portal"
            style={{ marginTop: 4 }}
          >
            <span style={{ fontSize: '15px' }}>↩</span>
            <span className="admin-nav-item-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-shell__main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Modern Top Header Area */}
        <header className="admin-topbar-modern">
          <div className="admin-topbar-left">
            <button
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              className="admin-hamburger-btn"
              aria-label="Toggle navigation menu"
              title="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="admin-search-wrapper">
              <span className="admin-search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers, transactions, or pages..."
                className="admin-search-input"
                aria-label="Search station portal"
              />
              <span className="admin-search-kbd">Ctrl + K</span>
            </form>
          </div>

          {/* Right Header Controls */}
          <div className="admin-topbar-right">
            {/* Notification Bell */}
            <NotificationBell title="Pending link requests and station alerts" />


            {/* Profile Avatar Pill */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(o => !o)}
                className="admin-profile-pill"
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
              >
                <div className="admin-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="admin-user-info-text">
                  <span className="admin-user-name">{user?.name || 'Admin'}</span>
                  <span className="admin-user-role">Station Admin</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 200,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    padding: '6px',
                    zIndex: 200,
                  }}
                >
                  <button
                    onClick={() => { setProfileDropdownOpen(false); nav('/admin/profile'); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 8,
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span>👤</span>
                    <span>Admin Profile</span>
                  </button>

                  <button
                    onClick={() => { setProfileDropdownOpen(false); nav('/admin/recovery-key'); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 8,
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span>🔑</span>
                    <span>Recovery Key</span>
                  </button>

                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: 8,
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <span>↩</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Child Views */}
        <div className="admin-shell__content" style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </div>
      </main>

      {/* Support & Documentation Modal */}
      {helpModalOpen && (
        <div className="modal-overlay" onClick={() => setHelpModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🎧</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 750, color: '#0f172a' }}>Petrol Station Help & Docs</h3>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
              Welcome to the <strong>Petrol Management System</strong> Station Admin Portal. You can manage fuel transactions, track customer credit limits, view live ledgers, and download financial statements.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                <strong>⛽ Recording Fuel Sales:</strong> Navigate to <em>Fuel Entry</em>, select customer, enter quantity in litres, rate, and save.
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                <strong>💳 Receiving Customer Payments:</strong> Open <em>Transactions</em>, click <em>Receive Payment</em>, specify payment amount and receipt notes.
              </div>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
                <strong>📊 Reports & Excel Exports:</strong> Visit <em>Export Center</em> to generate formatted daily, monthly, or yearly workbooks.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="admin-primary-btn"
                style={{ minHeight: 38 }}
              >
                Got It, Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
