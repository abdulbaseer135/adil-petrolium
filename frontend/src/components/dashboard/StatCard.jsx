import React from 'react';

export function StatCard({
  icon,
  label,
  title,
  value,
  subtext,
  description,
  variant = 'primary', // 'primary' | 'secondary' | 'warning' | 'danger' | 'success'
  trend = null, // { direction: 'up' | 'down', text: '+12%' }
  onClick,
  className = '',
}) {
  const displayLabel = label || title;
  const displaySubtext = subtext || description;

  return (
    <div
      className={`stat-card-unified ${onClick ? 'app-card--interactive' : ''} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <div className="stat-card-unified__top">
        <div className="stat-card-unified__label-group">
          {icon && (
            <div className={`stat-card-unified__icon-badge stat-card-unified__icon-badge--${variant}`}>
              {React.isValidElement(icon) ? icon : <span style={{ fontSize: 16 }}>{icon}</span>}
            </div>
          )}
          <span className="stat-card-unified__label">{displayLabel}</span>
        </div>
      </div>

      <div className="stat-card-unified__value">
        {value}
      </div>

      {(displaySubtext || trend) && (
        <div className="stat-card-unified__footer">
          {trend && (
            <span
              className={`kpi-pill-badge ${trend.direction === 'down' ? 'trend-down' : 'trend-up'}`}
            >
              {trend.direction === 'down' ? '▼' : '▲'} {trend.text}
            </span>
          )}
          {displaySubtext && <span>{displaySubtext}</span>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
