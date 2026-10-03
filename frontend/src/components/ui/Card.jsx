import React from 'react';

export function Card({
  title,
  subtitle,
  icon,
  action,
  headerActions,
  children,
  footer,
  className = '',
  interactive = false,
  onClick,
  style = {},
}) {
  const isInteractive = interactive || !!onClick;
  const rightAction = action || headerActions;

  return (
    <div
      className={`app-card ${isInteractive ? 'app-card--interactive' : ''} ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {(title || subtitle || icon || action) && (
        <div className="app-card__header">
          <div className="app-card__title-group">
            {icon && (
              <div className="app-card__icon">
                {React.isValidElement(icon) ? icon : <span style={{ fontSize: 16 }}>{icon}</span>}
              </div>
            )}
            <div>
              {title && <div className="app-card__title">{title}</div>}
              {subtitle && <div className="app-card__subtitle">{subtitle}</div>}
            </div>
          </div>
          {rightAction && <div>{rightAction}</div>}
        </div>
      )}

      {children}

      {footer && (
        <div style={{ marginTop: 'var(--space-4, 16px)', paddingTop: 'var(--space-3, 12px)', borderTop: '1px solid var(--border-divider, #E8ECEF)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
