import React from 'react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
}) {
  return (
    <div className="app-page-header">
      <div className="app-page-header__left">
        {eyebrow && <span className="app-page-header__eyebrow">{eyebrow}</span>}
        {title && <h1 className="app-page-header__title">{title}</h1>}
        {subtitle && <p className="app-page-header__subtitle">{subtitle}</p>}
      </div>

      {(actions || children) && (
        <div className="app-page-header__actions">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
