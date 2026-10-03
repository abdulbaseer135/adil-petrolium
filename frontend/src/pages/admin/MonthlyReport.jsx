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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = formatCurrencyShortPK;
const fmtL = (v) => `${formatNumberPK(v, 0, 0)} L`;

export default function MonthlyReport() {
  const currentDate = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const availableYears = useMemo(() => [2023, 2024, 2025, 2026], []);

  const availableMonths = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // If selected year is in the future, no months available
    if (year > currentYear) return [];
    
    // If selected year is in the past, all months available
    if (year < currentYear) return MONTHS.map((label, index) => ({ label, value: index + 1 }));
    
    // If selected year is current, only show months up to current month
    return MONTHS.slice(0, currentMonth).map((label, index) => ({ label, value: index + 1 }));
  }, [year, currentDate]);

  const loadMonthly = useCallback(async (targetYear = year, targetMonth = month) => {
    setLoading(true);
    setError('');
    try {
      const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const monthEnd = new Date(targetYear, targetMonth, 0).getDate();
      const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(monthEnd).padStart(2, '0')}`;

      const all = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await getTransactions({
          startDate,
          endDate,
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
      setError(err.response?.data?.message || 'Failed to load monthly details');
      setTransactions([]);
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadMonthly();
  }, [loadMonthly]);

  const handleReload = async () => {
    setReloading(true);
    await loadMonthly();
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (newYear > currentYear) {
      setMonth(1);
    } else if (newYear === currentYear && month > currentMonth) {
      setMonth(currentMonth);
    }
  };

  const summary = useMemo(() => transactions.reduce((acc, tx) => {
    acc.totalFuelSold += Number(tx.fuelQuantity) || 0;
    acc.totalSales += Number(tx.totalAmount) || 0;
    acc.totalPayments += Number(tx.paymentReceived) || 0;
    return acc;
  }, { totalFuelSold: 0, totalSales: 0, totalPayments: 0 }), [transactions]);

  const statementGroups = useMemo(() => buildCustomerStatementGroups(transactions), [transactions]);
  const filteredStatementGroups = useMemo(
    () => filterCustomerStatementGroups(statementGroups, searchQuery),
    [statementGroups, searchQuery]
  );

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Monthly Report"
        subtitle="Monthly transaction review grouped by day and customer activity."
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: 110 }}>
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {availableMonths.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </Select>
            </div>
            <div style={{ width: 95 }}>
              <Select value={year} onChange={(e) => handleYearChange(Number(e.target.value))}>
                {availableYears.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </div>
            <Button variant="secondary" onClick={handleReload} loading={reloading}>
              <RefreshCw size={15} />
              <span>Reload</span>
            </Button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Total Sale"
          value={loading ? 'Loading…' : fmt(summary.totalSales)}
          icon={<DollarSign size={20} />}
          description="Debit transactions in selected month"
        />
        <StatCard
          title="Total Fuel Sold"
          value={loading ? 'Loading…' : fmtL(summary.totalFuelSold)}
          icon={<Fuel size={20} />}
          description="Total litres sold across all entries"
        />
        <StatCard
          title="Total Payments"
          value={loading ? 'Loading…' : fmt(summary.totalPayments)}
          icon={<CreditCard size={20} />}
          description="Credit transactions received"
        />
        <StatCard
          title="Net Balance"
          value={loading ? 'Loading…' : fmt(summary.totalSales - summary.totalPayments)}
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
        onRetry={handleReload}
        emptyIcon={<FileText size={36} color="var(--text-muted)" />}
        emptyTitle="No purchases for this month"
        emptyDescription="No customer purchases found for the selected month."
      />
    </div>
  );
}
