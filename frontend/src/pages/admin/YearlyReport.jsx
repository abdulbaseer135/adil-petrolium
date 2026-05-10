import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getTransactions } from '../../api/transactionApi';
import { Button } from '../../components/ui/Button';
import { CustomerStatementGroups, buildCustomerStatementGroups, filterCustomerStatementGroups } from '../../components/admin/CustomerStatementGroups';
import { SectionHeader, Section } from '../../components/ui/Section';
import { formatCurrencyPK, formatDateTimePK, formatNumberPK, formatCurrencyShortPK } from '../../utils/pkFormat';

const fmt = formatCurrencyShortPK;
const fmtL = (v) => `${formatNumberPK(v, 0, 0)} L`;
const fmtDT = formatDateTimePK;
const formatNumber = formatNumberPK;

export default function YearlyReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadYear = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const all = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await getTransactions({
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          page,
          limit: 100,
          sort: 'transactionDate',
        });
        all.push(...(res.data?.data || []));
        totalPages = res.data?.meta?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setTransactions(all.filter((tx) => !tx.isVoided));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load yearly details');
      setTransactions([]);
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { loadYear(); }, [loadYear]);

  const summary = useMemo(() => transactions.reduce((acc, tx) => {
    acc.fuel += Number(tx.fuelQuantity) || 0;
    acc.sales += Number(tx.totalAmount) || 0;
    acc.payments += Number(tx.paymentReceived) || 0;
    return acc;
  }, { fuel: 0, sales: 0, payments: 0 }), [transactions]);

  const statementGroups = useMemo(() => buildCustomerStatementGroups(transactions), [transactions]);
  const filteredStatementGroups = useMemo(
    () => filterCustomerStatementGroups(statementGroups, searchQuery),
    [statementGroups, searchQuery]
  );

  return (
    <div className="animate-fadeIn report-page">
      <div className="report-hero">
        <div className="page-shell__title-group">
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>Yearly Report</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            Yearly transaction review for the selected financial year.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 'var(--space-4)', marginInline: 'var(--space-4)' }}>
        <div className="report-stat-card" style={{ '--card-accent': 'var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>Total Sale</div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>{loading ? 'Loading…' : fmt(summary.sales)}</div>
          <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Debit transactions in the selected year.</div>
        </div>
        <div className="report-stat-card" style={{ '--card-accent': 'var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>Total Fuel Sold</div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums' }}>{loading ? 'Loading…' : fmtL(summary.fuel)}</div>
          <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Total litres sold across all entries.</div>
        </div>
        <div className="report-stat-card" style={{ '--card-accent': 'var(--color-success)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>Total Payments</div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>{loading ? 'Loading…' : fmt(summary.payments)}</div>
          <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Credit transactions received.</div>
        </div>
        <div className="report-stat-card" style={{ '--card-accent': 'var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>Remaining</div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums' }}>{loading ? 'Loading…' : fmt(summary.sales - summary.payments)}</div>
          <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Outstanding amount after payments.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', marginBottom: 'var(--space-4)', marginInline: 'var(--space-4)' }}>
        <div className="report-filter" style={{ minWidth: 240, maxWidth: 400 }}>
          <span className="report-filter__label">Search</span>
          <input
            className="report-filter__control"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name..."
          />
        </div>

        <div style={{ flex: 1 }} />

        <div className="report-filter">
          <span className="report-filter__label">Year</span>
          <select className="report-filter__control" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <Button onClick={loadYear}>Reload</Button>
      </div>

      <CustomerStatementGroups
        groups={filteredStatementGroups}
        loading={loading}
        error={error}
        onRetry={loadYear}
        emptyIcon="🧾"
        emptyTitle="No purchases for this year"
        emptyDescription="No customer purchases found for the selected year."
      />
    </div>
  );
}
