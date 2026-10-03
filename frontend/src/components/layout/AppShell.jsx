import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';

export default function AppShell({
  role = 'admin',
  navItems = [],
  navSections = null,
  user = null,
  onLogout,
  searchPlaceholder = 'Search...',
  onSearchSubmit = null,
  searchQuery = '',
  onSearchChange = null,
  contextBadge = null,
  notificationTitle = 'Notifications',
  helpContent = null,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchInputRef = useRef(null);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Keyboard shortcut Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && onSearchSubmit) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (mobileOpen) setMobileOpen(false);
        if (helpOpen) setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, helpOpen, onSearchSubmit]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div className={`app-shell app-shell--${role}`}>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="app-backdrop"
          aria-hidden="true"
        />
      )}

      {/* Shared Unified Sidebar */}
      <Sidebar
        role={role}
        navItems={navItems}
        navSections={navSections}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenHelp={helpContent ? () => setHelpOpen(true) : null}
        onLogout={onLogout}
      />

      {/* Main Content Viewport */}
      <div className="app-main">
        <Topbar
          onToggleSidebar={handleToggleSidebar}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          searchPlaceholder={searchPlaceholder}
          searchInputRef={searchInputRef}
          user={user}
          role={role}
          onLogout={onLogout}
          contextBadge={contextBadge}
          notificationTitle={notificationTitle}
        />

        <main className="app-content">
          {children || <Outlet />}
        </main>
      </div>

      {/* Optional Help / Documentation Modal */}
      {helpContent && helpOpen && (
        <Modal
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={helpContent.title || 'Help & Documentation'}
          footer={
            <Button onClick={() => setHelpOpen(false)}>
              Got It, Thanks
            </Button>
          }
        >
          {helpContent.body}
        </Modal>
      )}
    </div>
  );
}
