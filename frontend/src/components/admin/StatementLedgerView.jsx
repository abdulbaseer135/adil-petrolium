import React from 'react';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonTable } from '../ui/Skeleton';

const SECTION_TITLE = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
};

const tableHeadStyle = {
};

const cellStyle = {
};

const numericCellStyle = {
  ...cellStyle,
  fontVariantNumeric: 'tabular-nums',
};

const MetricCard = ({ label, value, accent, hint }) => (
  <div
    className="financial-summary-card"
  >
    <div style={SECTION_TITLE}>{label}</div>
    <div className="financial-summary-value" style={{ color: accent || 'var(--color-text)' }}>
      {value}
    </div>
    {hint ? (
      <div className="financial-summary-hint">
        {hint}
      </div>
    ) : null}
  </div>
);

const SummaryPanel = ({ title, items }) => (
  <div
    className="financial-summary-card"
  >
    <div style={SECTION_TITLE}>{title}</div>
    <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ fontWeight: 700 }}>{item.label}</div>
          <div style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{item.value}</div>
        </div>
      ))}
    </div>
  </div>
);

export function StatementLedgerView({
  title,
  subtitle,
  controls,
  summaryCards,
  infoCards = [],
  tableTitle,
  tableSubtitle,
  rows,
  loading,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  leftPanelTitle,
  leftPanelItems,
  rightPanelTitle,
  rightPanelItems,
  tableMinWidth = 1200,
  footerNote,
}) {
  return (
    <div className="animate-fadeIn report-page">
      <div
        style={{
          paddingBottom: 'var(--space-5)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div>
          <div style={SECTION_TITLE}>Account Statement</div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}>
            {title}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            {subtitle}
          </p>
        </div>
        {controls ? <div className="financial-filter-row">{controls}</div> : null}
      </div>

      <div className="report-stat-grid">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {infoCards.length > 0 ? (
        <div className="financial-summary-card" style={{ padding: 'var(--space-5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
          {infoCards.map((item) => (
            <div key={item.label}>
              <div style={SECTION_TITLE}>{item.label}</div>
              <div style={{ marginTop: 'var(--space-1)', fontWeight: 700, color: item.accent || 'var(--color-text)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="financial-table-shell">
        <div className="financial-table-toolbar">
          <div>
            <h2 className="financial-table-title">{tableTitle}</h2>
            <p className="financial-table-subtitle">{tableSubtitle}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-4)' }}>
            <SkeletonTable rows={8} cols={11} />
          </div>
        ) : error ? (
          <div style={{ padding: 'var(--space-5)' }}>
            <EmptyState
              icon="⚠️"
              title={emptyTitle || 'Could not load report'}
              description={error}
              action={onRetry}
              actionLabel="Try Again"
            />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={emptyIcon || '🧾'}
            title={emptyTitle || 'No rows found'}
            description={emptyDescription || 'No entries found for the selected period.'}
          />
        ) : (
          <>
            <div className="financial-table-wrap">
              <table
                className="financial-table"
                style={{ minWidth: tableMinWidth }}
              >
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    <th style={tableHeadStyle}>Date</th>
                    <th style={tableHeadStyle}>Voucher</th>
                    <th style={tableHeadStyle}>A/C Info</th>
                    <th style={tableHeadStyle}>Product</th>
                    <th style={tableHeadStyle}>Inst No</th>
                    <th style={tableHeadStyle}>Vehicle</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Qty</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Rate</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Debit</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Credit</th>
                    <th style={{ ...tableHeadStyle, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id || index}
                      style={{
                        borderTop: '1px solid var(--color-divider)',
                        background: index % 2 ? 'color-mix(in oklch, var(--color-surface-2) 70%, var(--color-surface))' : 'transparent',
                      }}
                    >
                      <td style={cellStyle}>
                        <div className="is-strong">{row.date}</div>
                      </td>
                      <td style={cellStyle}>{row.voucher || '—'}</td>
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600 }}>{row.accountCode || '—'}</div>
                        {row.accountName ? (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {row.accountName}
                          </div>
                        ) : null}
                      </td>
                      <td style={cellStyle}>{row.product || '—'}</td>
                      <td style={cellStyle}>{row.instNo || '—'}</td>
                      <td style={cellStyle}>{row.vehicle || '—'}</td>
                      <td style={numericCellStyle} className="is-numeric">{row.qty || '—'}</td>
                      <td style={numericCellStyle} className="is-numeric">{row.rate || '—'}</td>
                      <td style={numericCellStyle} className="is-numeric is-strong">{row.debit || '—'}</td>
                      <td style={numericCellStyle} className="is-numeric is-strong">{row.credit || '—'}</td>
                      <td
                        style={{
                          ...numericCellStyle,
                          fontWeight: 700,
                          color: Number(row.balanceValue) > 0 ? 'var(--color-error)' : 'var(--color-success)',
                        }}
                        className="is-numeric is-strong"
                      >
                        {row.balance || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(leftPanelTitle || rightPanelTitle) ? (
              <div className="financial-detail-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', borderTop: '1px solid var(--color-divider)', background: 'var(--color-surface)' }}>
                {leftPanelTitle ? <SummaryPanel title={leftPanelTitle} items={leftPanelItems || []} /> : <div />}
                {rightPanelTitle ? <SummaryPanel title={rightPanelTitle} items={rightPanelItems || []} /> : <div />}
              </div>
            ) : null}
          </>
        )}
      </div>

      {footerNote ? (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>{footerNote}</div>
      ) : null}
    </div>
  );
}
