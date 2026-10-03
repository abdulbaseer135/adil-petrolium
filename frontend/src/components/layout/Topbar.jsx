import React from 'react';
import { Menu, Search } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';
import UserMenu from './UserMenu';

export default function Topbar({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search...',
  searchInputRef,
  user,
  role,
  onLogout,
  contextBadge = null,
  notificationTitle = 'Notifications',
}) {
  return (
    <header className="app-topbar">
      <div className="app-topbar__left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="app-topbar__toggle-btn"
          aria-label="Toggle navigation sidebar"
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        {onSearchSubmit ? (
          <form onSubmit={onSearchSubmit} className="app-topbar__search-form">
            <span className="app-topbar__search-icon">
              <Search size={15} />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="app-topbar__search-input"
              aria-label="Search portal"
            />
            <span className="app-topbar__search-kbd">Ctrl + K</span>
          </form>
        ) : contextBadge ? (
          <div className="app-topbar__context-pill">
            {contextBadge}
          </div>
        ) : null}
      </div>

      <div className="app-topbar__right">
        <NotificationBell title={notificationTitle} />
        <UserMenu user={user} role={role} onLogout={onLogout} />
      </div>
    </header>
  );
}
