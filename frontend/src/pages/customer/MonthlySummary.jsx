import React, { useEffect, useState } from 'react';
import { getMySummaryMonthly } from '../../api/customerApi';
import { formatNumberPK } from '../../utils/pkFormat';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Format different number types: fuel (0 decimals), currency (2 decimals)
const formatFuel = (n) => formatNumberPK(n, 0, 0);
const formatCurrency = (n) => formatNumberPK(n, 2, 2);

export default function MonthlySummary() {
  const [data, setData]     = useState([]);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMySummaryMonthly(year)
      .then(r => setData(r.data.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div className="animate-fadeIn page-shell">
      <div className="page-shell__header">
        <div className="page-shell__title-group">
          <h1 className="page-shell__title">Monthly Summary</h1>
          <p className="page-shell__subtitle">Overview of fuel purchases and payments by month.</p>
        </div>

        <div className="page-shell__actions">
          <select value={year} onChange={e => setYear(+e.target.value)} className="report-filter__control">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="surface-panel">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                {['Month','Fuel (L)','Sales (Rs)','Paid (Rs)','Closing Balance'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Month' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && data.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>No data for {year}</td></tr>
              )}
              {data.map((r) => (
                <tr key={r.month}>
                  <td style={{ fontWeight: 600 }}>{MONTHS[r.month - 1]}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatFuel(r.totalFuel)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.totalSales)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(r.totalPayments)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.closingBalance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>{formatCurrency(r.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}