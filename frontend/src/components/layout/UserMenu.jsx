import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Key, Shield } from 'lucide-react';

export default function UserMenu({ user, role, onLogout, extraLinks = [] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roleLabels = {
    super_admin: 'Super Admin',
    admin: 'Station Admin',
    customer: 'Customer',
  };

  const roleLabel = roleLabels[role] || (role ? role.toUpperCase() : 'User');
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : (roleLabel.charAt(0) || 'U');

  const defaultLinks = [];
  if (role === 'admin') {
    defaultLinks.push(
      { label: 'Admin Profile', path: '/admin/profile', icon: <User size={15} /> },
      { label: 'Recovery Key', path: '/admin/recovery-key', icon: <Key size={15} /> }
    );
  } else if (role === 'super_admin') {
    defaultLinks.push(
      { label: 'Platform Audit Logs', path: '/super-admin/audit-logs', icon: <Shield size={15} /> }
    );
  }

  const allLinks = [...defaultLinks, ...extraLinks];

  return (
    <div className="app-user-menu" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="app-user-menu__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="app-user-menu__avatar">
          {initial}
        </div>
        <div className="app-user-menu__info">
          <span className="app-user-menu__name">{user?.name || roleLabel}</span>
          <span className="app-user-menu__role">{roleLabel}</span>
        </div>
        <div className="app-user-menu__chevron">
          <ChevronDown size={14} />
        </div>
      </button>

      {open && (
        <div className="app-user-menu__dropdown" role="menu">
          <div className="app-user-menu__header">
            <div className="app-user-menu__user-name">{user?.name || roleLabel}</div>
            <div className="app-user-menu__user-email">{user?.email || ''}</div>
          </div>

          {allLinks.map((item) => (
            <button
              key={item.path}
              type="button"
              className="app-user-menu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(item.path);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          {allLinks.length > 0 && <div className="app-user-menu__divider" />}

          <button
            type="button"
            className="app-user-menu__item danger"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              if (onLogout) await onLogout();
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
