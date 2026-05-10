import React from 'react';

/**
 * Section: reusable container for page content with consistent styling.
 */
export const Section = ({
  children,
  title,
  subtitle,
  action,
  border = true,
  padding = 'var(--space-4)',
  maxWidth = null,
}) => (
  <div
    className="surface-panel ui-section"
    style={{
      border: border ? '1px solid var(--color-border)' : 'none',
      padding,
      maxWidth,
      width: '100%',
    }}
  >
    {(title || subtitle || action) && (
      <div
        className="section-header"
        style={{
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-3)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div className="section-title-group">
          {title && (
            <h2
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 750,
                letterSpacing: '-0.02em',
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              style={{
                marginTop: 'var(--space-1)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="section-actions">{action}</div>}
      </div>
    )}
    {children}
  </div>
);

/**
 * SectionGrid: Responsive grid for laying out sections with consistent gaps.
 */
export const SectionGrid = ({ children, columns = 1, gap = 'var(--space-5)' }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      width: '100%',
    }}
  >
    {children}
  </div>
);

/**
 * Card: compact reusable card for KPIs, stats, and inline content.
 */
export const Card = ({ label, value, hint, icon, accent, onClick, style = {} }) => (
  <div
    className="stat-card stat-card--dense"
    onClick={onClick}
    style={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all var(--transition)',
      ...style,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-2)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      {icon && (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: `color-mix(in oklch, ${accent || 'var(--color-primary)'} 12%, var(--color-surface))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
      )}
    </div>

    <p
      style={{
        fontSize: 'clamp(1.2rem, 1.9vw, 1.55rem)',
        fontWeight: 750,
        fontVariantNumeric: 'tabular-nums',
        color: accent || 'var(--color-text)',
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
        margin: 0,
        marginBottom: 'var(--space-2)',
      }}
    >
      {value}
    </p>

    {hint && (
      <p
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          margin: 0,
        }}
      >
        {hint}
      </p>
    )}

    <div
      style={{
        height: 3,
        borderRadius: 2,
        marginTop: 'var(--space-2)',
        background: `color-mix(in oklch, ${accent || 'var(--color-primary)'} 28%, transparent)`,
      }}
    />
  </div>
);

/**
 * SectionHeader: Standardized header for pages with title, subtitle, and optional action.
 */
export const SectionHeader = ({ title, subtitle, action }) => (
  <div
    className="page-shell__header"
    style={{
      marginBottom: 'var(--space-4)',
    }}
  >
    <div className="page-shell__title-group">
      <h1
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 750,
          letterSpacing: '-0.03em',
          color: 'var(--color-text)',
          margin: 0,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            marginTop: 'var(--space-1)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="page-shell__actions">{action}</div>}
  </div>
);
