import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getMySummaryMonthly } from '../../api/customerApi';
import { formatNumberPK } from '../../utils/pkFormat';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2022 }, (_, i) => 2023 + i);

const formatFuel = (n) => formatNumberPK(n, 0, 0);
const formatCurrency = (n) => formatNumberPK(n, 2, 2);

function YearDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          background: 'var(--bg-surface, #FFFFFF)',
          border: '1px solid var(--border-default, #E2E8EC)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary, #17242D)',
          minWidth: '94px',
          justifyContent: 'space-between',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select year"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 200,
            margin: 0,
            padding: '4px',
            listStyle: 'none',
            background: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-default, #E2E8EC)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: 'var(--shadow-dropdown)',
            minWidth: '94px',
          }}
        >
          {YEARS.map((y) => (
            <li
              key={y}
              role="option"
              aria-selected={y === value}
              onClick={() => { onChange(y); setOpen(false); }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '13px',
                borderRadius: '6px',
                fontWeight: y === value ? 700 : 500,
                color: y === value ? 'var(--color-primary)' : 'var(--text-primary)',
                background: y === value ? 'var(--color-primary-soft)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (y !== value) e.currentTarget.style.background = 'var(--bg-surface-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = y === value ? 'var(--color-primary-soft)' : 'transparent'; }}
            >
              {y}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MonthlySummary() {
  const [data, setData] = useState([]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMySummaryMonthly(year)
      .then((r) => setData(r.data.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Monthly Summary"
        subtitle="Overview of fuel purchases and payments by month."
        actions={<YearDropdown value={year} onChange={setYear} />}
      />

      <Card>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 540 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default, #E2E8EC)', background: 'var(--bg-surface-secondary, #F9FAFB)', textAlign: 'left', color: 'var(--text-secondary, #5B6870)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {['Month','Fuel (L)','Sales (Rs)','Paid (Rs)','Closing Balance'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Month' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No purchase data recorded for {year}
                  </td>
                </tr>
              )}
              {data.map((r) => (
                <tr key={r.month} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{MONTHS[r.month - 1]}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatFuel(r.totalFuel)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.totalSales)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.totalPayments)}</td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                      color: r.closingBalance > 0 ? 'var(--color-danger, #C64040)' : 'var(--color-success, #18864B)',
                    }}
                  >
                    {formatCurrency(r.closingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}