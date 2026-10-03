import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, DollarSign, Fuel, CreditCard, TrendingUp, Search, FileText } from 'lucide-react';
import { getTransactions } from '../../api/transactionApi';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { CustomerStatementGroups, buildCustomerStatementGroups, filterCustomerStatementGroups } from '../../components/admin/CustomerStatementGroups';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/dashboard/StatCard';
import { formatNumberPK, formatCurrencyShortPK } from '../../utils/pkFormat';

const fmt = formatCurrencyShortPK;
const fmtL = (v) => `${formatNumberPK(v, 0, 0)} L`;

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
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Yearly Report"
        subtitle="Yearly transaction review for the selected financial year."
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: 100 }}>
              <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2023, 2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <Button variant="secondary" onClick={loadYear}>
              <RefreshCw size={15} />
              <span>Reload</span>
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Total Sale"
          value={loading ? 'Loading…' : fmt(summary.sales)}
          icon={<DollarSign size={20} />}
          description="Debit transactions in selected year"
        />
        <StatCard
          title="Total Fuel Sold"
          value={loading ? 'Loading…' : fmtL(summary.fuel)}
          icon={<Fuel size={20} />}
          description="Total litres sold across all entries"
        />
        <StatCard
          title="Total Payments"
          value={loading ? 'Loading…' : fmt(summary.payments)}
          icon={<CreditCard size={20} />}
          description="Credit transactions received"
        />
        <StatCard
          title="Net Balance"
          value={loading ? 'Loading…' : fmt(summary.sales - summary.payments)}
          icon={<TrendingUp size={20} />}
          description="Outstanding amount after payments"
        />
      </div>

      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: 400 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
        </div>
      </Card>

      <CustomerStatementGroups
        groups={filteredStatementGroups}
        loading={loading}
        error={error}
        onRetry={loadYear}
        emptyIcon={<FileText size={36} color="var(--text-muted)" />}
        emptyTitle="No purchases for this year"
        emptyDescription="No customer purchases found for the selected year."
      />
    </div>
  );
}
