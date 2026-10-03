import React from 'react';
import { NavLink } from 'react-router-dom';
import { Fuel, X, HelpCircle, ChevronRight, LogOut } from 'lucide-react';

export default function Sidebar({
  role = 'admin',
  navItems = [],
  navSections = null,
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
  onOpenHelp,
  onLogout,
}) {
  const roleBadgeMap = {
    super_admin: { text: 'SUPER ADMIN', modifier: 'super_admin' },
    admin: { text: 'STATION ADMIN', modifier: 'admin' },
    customer: { text: 'CUSTOMER', modifier: 'customer' },
  };

  const badgeInfo = roleBadgeMap[role] || { text: role.toUpperCase(), modifier: 'admin' };

  const renderLink = (item) => {
    const IconComponent = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onCloseMobile}
        className={({ isActive }) =>
          `app-sidebar__link ${isActive ? 'active' : ''}`
        }
        title={collapsed ? item.label : undefined}
      >
        <span className="app-sidebar__link-icon">
          {IconComponent ? (
            React.isValidElement(IconComponent) ? (
              IconComponent
            ) : (
              <IconComponent size={18} />
            )
          ) : null}
        </span>
        <span className="app-sidebar__link-label">{item.label}</span>
        {item.count != null && item.count > 0 && (
          <span className="app-sidebar__link-count">{item.count}</span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${
        mobileOpen ? 'mobile-open' : ''
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Brand Block */}
      <div className="app-sidebar__brand">
        <div className="app-sidebar__brand-logo" title="Petrol Management System">
          <Fuel size={20} strokeWidth={2.4} />
        </div>
        <div className="app-sidebar__brand-text">
          <span className="app-sidebar__brand-title">Petrol Management</span>
          <span className={`app-sidebar__role-badge app-sidebar__role-badge--${badgeInfo.modifier}`}>
            {badgeInfo.text}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="app-sidebar__close-btn"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="app-sidebar__nav">
        {navSections
          ? navSections.map((section, idx) => (
              <div key={section.title || idx}>
                {section.title && !collapsed && (
                  <div className="app-sidebar__section-title">{section.title}</div>
                )}
                {section.items.map(renderLink)}
              </div>
            ))
          : navItems.map(renderLink)}
      </nav>

      {/* Footer Block */}
      <div className="app-sidebar__footer">
        {onOpenHelp && (
          <div
            onClick={onOpenHelp}
            className="app-sidebar__help"
            role="button"
            tabIndex={0}
            title="Help & Documentation"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenHelp();
            }}
          >
            <div className="app-sidebar__help-content">
              <div className="app-sidebar__help-icon">
                <HelpCircle size={16} />
              </div>
              <div>
                <div className="app-sidebar__help-title">Need Help?</div>
                <div className="app-sidebar__help-desc">Support & Docs</div>
              </div>
            </div>
            <div className="app-sidebar__help-arrow">
              <ChevronRight size={14} />
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="app-sidebar__signout-btn"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="app-sidebar__signout-text">Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
