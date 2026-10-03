import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function QuickAction({
  to,
  icon,
  label,
  description,
  title,
  onClick,
}) {
  const content = (
    <>
      <div className="quick-action-tile__content">
        {icon && (
          <div className="quick-action-tile__icon">
            {React.isValidElement(icon) ? icon : <span style={{ fontSize: 16 }}>{icon}</span>}
          </div>
        )}
        <div>
          <div className="quick-action-tile__label">{label}</div>
          {description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #7A878E)', marginTop: 2 }}>
              {description}
            </div>
          )}
        </div>
      </div>
      <div className="quick-action-tile__arrow">
        <ArrowRight size={16} />
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="quick-action-tile" title={title || label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="quick-action-tile"
      title={title || label}
      style={{ width: '100%', textAlign: 'left' }}
    >
      {content}
    </button>
  );
}
