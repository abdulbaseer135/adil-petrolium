import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Fuel,
  BarChart3,
  Calendar,
  Download,
  FileText,
  UserPlus,
  ArrowRight,
  Bell,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { getCustomers } from '../../api/customerApi';
import { getTransactions } from '../../api/transactionApi';
import { getDaily } from '../../api/reportApi';
import { getAdminLinkRequests } from '../../api/customerPumpApi';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import QuickAction from '../../components/dashboard/QuickAction';
import { formatCurrencyPK, formatNumberPK, toInputDatePK, formatDatePK } from '../../utils/pkFormat';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const today = toInputDatePK(new Date());

  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [fuelStock, setFuelStock] = useState([]);
  const [pendingLinkCount, setPendingLinkCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7'); // '7' | '14' | '30'

  // Formatted date string
  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Compute time range days
  const daysList = useMemo(() => {
    const count = Number(timeRange) || 7;
    const list = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      list.push({
        iso: toInputDatePK(d),
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return list;
  }, [timeRange]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const startDateTrend = daysList[0].iso;
        const endDateTrend = daysList[daysList.length - 1].iso;

        const [custResult, todayTxResult, trendTxResult, dailyResult, linkRequestsResult] =
          await Promise.allSettled([
            getCustomers({ limit: 100, isActive: true }),
            getTransactions({ startDate: today, endDate: today, limit: 100 }),
            getTransactions({ startDate: startDateTrend, endDate: endDateTrend, limit: 100 }),
            getDaily({ date: today }),
            getAdminLinkRequests({ status: 'pending', limit: 1 }),
          ]);

        if (!isMounted) return;

        // Pending Link Requests
        if (linkRequestsResult.status === 'fulfilled') {
          const total =
            linkRequestsResult.value?.data?.meta?.total ??
            linkRequestsResult.value?.data?.data?.length ??
            0;
          setPendingLinkCount(total);
        }

        // Customers
        const customers =
          custResult.status === 'fulfilled' ? custResult.value?.data?.data || [] : [];

        // Today Transactions
        const todayTxs =
          todayTxResult.status === 'fulfilled' ? todayTxResult.value?.data?.data || [] : [];

        // Trend Transactions
        const trendTxs =
          trendTxResult.status === 'fulfilled' ? trendTxResult.value?.data?.data || [] : [];

        // Daily Record
        const daily =
          dailyResult.status === 'fulfilled' ? dailyResult.value?.data?.data || null : null;

        if (
          custResult.status === 'rejected' &&
          todayTxResult.status === 'rejected' &&
          trendTxResult.status === 'rejected'
        ) {
          setError('Failed to load dashboard data. Please try again.');
          setSummary(null);
          return;
        }

        // Aggregate Totals
        const totalOutstanding = customers.reduce(
          (sum, c) => sum + (Number(c.currentBalance) > 0 ? Number(c.currentBalance) : 0),
          0
        );

        const customersWithDebt = customers.filter(
          (c) => Number(c.currentBalance) > 0
        ).length;

        const todayRevenue = todayTxs.reduce(
          (sum, tx) => sum + (Number(tx.totalAmount) || 0),
          0
        );

        const todayCollected = todayTxs.reduce(
          (sum, tx) => sum + (Number(tx.paymentReceived) || 0),
          0
        );

        // Sort Top Customers by Balance
        const topCustomers = [...customers]
          .sort((a, b) => (Number(b.currentBalance) || 0) - (Number(a.currentBalance) || 0))
          .slice(0, 5);

        // Sort Recent Transactions (latest first)
        const recent = [...trendTxs, ...todayTxs]
          .filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i)
          .sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt))
          .slice(0, 6);

        // Aggregate Trend Points
        const trendPoints = daysList.map((day) => {
          const dayTxs = trendTxs.filter(
            (tx) => tx.transactionDate && tx.transactionDate.startsWith(day.iso)
          );
          const sales = dayTxs.reduce((sum, tx) => sum + (Number(tx.totalAmount) || 0), 0);
          const collections = dayTxs.reduce((sum, tx) => sum + (Number(tx.paymentReceived) || 0), 0);
          return {
            date: day.iso,
            label: day.label,
            sales,
            collections,
          };
        });

        // Fuel Stock Calculation
        const pmgIssued = todayTxs
          .filter((tx) => tx.fuelType === 'pmg')
          .reduce((sum, tx) => sum + (Number(tx.fuelQuantity) || 0), 0);
        const hsdIssued = todayTxs
          .filter((tx) => tx.fuelType === 'hsd')
          .reduce((sum, tx) => sum + (Number(tx.fuelQuantity) || 0), 0);
        const nrIssued = todayTxs
          .filter((tx) => tx.fuelType === 'nr')
          .reduce((sum, tx) => sum + (Number(tx.fuelQuantity) || 0), 0);

        const stockSummary = [
          { type: 'PMG', name: 'Petrol (PMG)', opening: daily?.openingPmg ?? 0, issued: pmgIssued, balance: (daily?.openingPmg ?? 0) - pmgIssued },
          { type: 'HSD', name: 'Diesel (HSD)', opening: daily?.openingHsd ?? 0, issued: hsdIssued, balance: (daily?.openingHsd ?? 0) - hsdIssued },
          { type: 'NR',  name: 'Kerosene (NR)', opening: daily?.openingNr ?? 0,  issued: nrIssued,  balance: (daily?.openingNr ?? 0) - nrIssued },
        ].filter(s => s.issued > 0 || s.opening > 0);

        setSummary({
          customersCount: customers.length,
          totalOutstanding,
          customersWithDebt,
          todayRevenue,
          todayCollected,
          todayTxCount: todayTxs.length,
          topCustomers,
          daily,
        });

        setRecentTransactions(recent);
        setTrendData(trendPoints);
        setFuelStock(stockSummary);
      } catch {
        if (isMounted) setError('Failed to load dashboard data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [today, daysList]);

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr', gap: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const fmtRs = (n) => `Rs ${formatNumberPK(n || 0, 0, 0)}`;
  const collectionRate =
    summary?.todayRevenue > 0
      ? Math.round((summary.todayCollected / summary.todayRevenue) * 100)
      : 0;

  // Chart coordinates
  const maxTrendVal = Math.max(
    1,
    ...trendData.map((d) => Math.max(d.sales || 0, d.collections || 0))
  );

  const chartWidth = 580;
  const chartHeight = 160;
  const paddingX = 45;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX - 15;
  const usableHeight = chartHeight - paddingY - 20;

  const pointsCount = trendData.length || 7;
  const getX = (index) => paddingX + (index * (usableWidth / Math.max(1, pointsCount - 1)));
  const getY = (val) => chartHeight - 20 - ((val / maxTrendVal) * usableHeight);

  const salesPath = trendData.length > 0
    ? trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sales)}`).join(' ')
    : `M ${paddingX} ${chartHeight - 20} L ${chartWidth - 15} ${chartHeight - 20}`;

  const collectionsPath = trendData.length > 0
    ? trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.collections)}`).join(' ')
    : `M ${paddingX} ${chartHeight - 20} L ${chartWidth - 15} ${chartHeight - 20}`;

  const salesAreaPath = trendData.length > 0
    ? `${salesPath} L ${getX(trendData.length - 1)} ${chartHeight - 20} L ${getX(0)} ${chartHeight - 20} Z`
    : '';

  const collectionsAreaPath = trendData.length > 0
    ? `${collectionsPath} L ${getX(trendData.length - 1)} ${chartHeight - 20} L ${getX(0)} ${chartHeight - 20} Z`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ─── Shared Page Header ─── */}
      <PageHeader
        title="Overview"
        subtitle="Monitor station performance and daily operations."
        actions={
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: 'var(--bg-surface, #FFFFFF)',
                border: '1px solid var(--border-default, #E2E8EC)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '13px',
                color: 'var(--text-secondary, #5B6870)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Calendar size={15} />
              <span>{formattedTodayDate}</span>
            </div>

            <Button
              onClick={() => navigate('/admin/exports')}
              variant="primary"
              iconLeft={<Download size={15} />}
            >
              Generate Report
            </Button>
          </>
        }
      />

      {/* ─── Pending Requests Notification Banner ─── */}
      {pendingLinkCount > 0 && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-lg, 12px)',
            background: 'var(--color-warning-bg, #FFF6E5)',
            border: '1px solid var(--color-warning-border, #FCE6BD)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'rgba(196, 123, 18, 0.15)',
                color: 'var(--color-warning, #C47B12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary, #17242D)', fontSize: '13.5px' }}>
                {pendingLinkCount} Pending Customer Connection Request{pendingLinkCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #5B6870)' }}>
                Review and approve customer account requests to enable online balance statements.
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate('/admin/customer-requests')}
            variant="secondary"
            size="sm"
            iconRight={<ArrowRight size={14} />}
          >
            Review Requests ({pendingLinkCount})
          </Button>
        </div>
      )}

      {/* ─── KPI Grid (4 Columns) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <StatCard
          icon={<Users size={18} strokeWidth={2.2} />}
          label="Active Customers"
          value={summary?.customersCount ?? 0}
          subtext="Registered customer accounts"
          variant="secondary"
        />

        <StatCard
          icon={<CreditCard size={18} strokeWidth={2.2} />}
          label="Total Outstanding"
          value={fmtRs(summary?.totalOutstanding)}
          subtext={`${summary?.customersWithDebt ?? 0} customers with balance`}
          variant="danger"
        />

        <StatCard
          icon={<Fuel size={18} strokeWidth={2.2} />}
          label="Today's Sales"
          value={fmtRs(summary?.todayRevenue)}
          subtext={`${summary?.todayTxCount ?? 0} fuel transactions`}
          variant="warning"
        />

        <StatCard
          icon={<BarChart3 size={18} strokeWidth={2.2} />}
          label="Today's Collections"
          value={fmtRs(summary?.todayCollected)}
          subtext={`${collectionRate}% collection rate`}
          variant="success"
        />
      </div>

      {/* ─── Middle Grid (Sales Trend + Quick Actions) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Trend Chart */}
        <Card
          title="Sales & Collections Trend"
          subtitle="Daily comparison over selected time range"
          icon={<TrendingUp size={16} />}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
                  Sales
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-secondary)' }} />
                  Collections
                </span>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{
                  background: 'var(--bg-surface-secondary, #F9FAFB)',
                  border: '1px solid var(--border-default, #E2E8EC)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #5B6870)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                aria-label="Select trend time range"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
          }
        >
          <div style={{ width: '100%', height: 220, position: 'relative' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="salesGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B5D4B" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#0B5D4B" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="collectionsGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F3A4D" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#1F3A4D" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[1.0, 0.8, 0.6, 0.4, 0.2, 0].map((step) => {
                const yPos = chartHeight - 20 - (step * usableHeight);
                const displayVal = maxTrendVal > 1
                  ? formatNumberPK((step * maxTrendVal) / 1000, 1, 1) + 'k'
                  : step.toFixed(1);

                return (
                  <g key={step}>
                    <line
                      x1={paddingX}
                      y1={yPos}
                      x2={chartWidth - 15}
                      y2={yPos}
                      stroke="var(--border-divider, #E8ECEF)"
                      strokeWidth="1"
                      strokeDasharray={step > 0 ? '3 3' : 'none'}
                    />
                    <text
                      x={paddingX - 8}
                      y={yPos + 3.5}
                      textAnchor="end"
                      fill="var(--text-muted, #7A878E)"
                      fontSize="9.5"
                      fontFamily="Inter, sans-serif"
                    >
                      Rs {displayVal}
                    </text>
                  </g>
                );
              })}

              {/* Area fills */}
              {salesAreaPath && <path d={salesAreaPath} fill="url(#salesGlow)" />}
              {collectionsAreaPath && <path d={collectionsAreaPath} fill="url(#collectionsGlow)" />}

              {/* Line paths */}
              <path
                d={salesPath}
                fill="none"
                stroke="var(--color-primary, #0B5D4B)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={collectionsPath}
                fill="none"
                stroke="var(--color-secondary, #1F3A4D)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {trendData.map((d, i) => {
                const cx = getX(i);
                const cySales = getY(d.sales);
                const cyCol = getY(d.collections);

                return (
                  <g key={d.date || i}>
                    <text
                      x={cx}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="var(--text-muted, #7A878E)"
                      fontSize="10"
                      fontFamily="Inter, sans-serif"
                      fontWeight="500"
                    >
                      {d.label}
                    </text>

                    <circle
                      cx={cx}
                      cy={cySales}
                      r="4"
                      fill="#ffffff"
                      stroke="var(--color-primary, #0B5D4B)"
                      strokeWidth="2"
                    >
                      <title>{`Sales: Rs ${d.sales}`}</title>
                    </circle>

                    <circle
                      cx={cx}
                      cy={cyCol}
                      r="4"
                      fill="#ffffff"
                      stroke="var(--color-secondary, #1F3A4D)"
                      strokeWidth="2"
                    >
                      <title>{`Collections: Rs ${d.collections}`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        {/* Quick Actions (Neutral, Clean) */}
        <Card
          title="Quick Actions"
          subtitle="Frequent station operations"
          icon={<Sparkles size={16} />}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', flex: 1 }}>
            <QuickAction
              to="/admin/fuel-entry"
              icon={<Fuel size={17} />}
              label="Add Fuel Entry"
              description="Record pump dispenser sale"
            />
            <QuickAction
              to="/admin/customers/new"
              icon={<UserPlus size={17} />}
              label="Register Customer"
              description="Create customer ledger"
            />
            <QuickAction
              to="/admin/transactions"
              icon={<FileText size={17} />}
              label="Transactions"
              description="Manage credit & payments"
            />
            <QuickAction
              to="/admin/daily-record"
              icon={<Calendar size={17} />}
              label="Daily Record"
              description="Inspect daily closing register"
            />
          </div>
        </Card>
      </div>

      {/* ─── Bottom Data Panels ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Recent Transactions */}
        <Card
          title="Recent Transactions"
          icon={<FileText size={16} />}
          action={
            <Link
              to="/admin/transactions"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-primary, #0B5D4B)',
                textDecoration: 'none',
              }}
            >
              View All →
            </Link>
          }
        >
          {recentTransactions.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default, #E2E8EC)', textAlign: 'left', color: 'var(--text-secondary, #5B6870)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Customer</th>
                    <th style={{ padding: '8px 10px' }}>Fuel</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Litres</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={tx._id || idx} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                      <td style={{ padding: '9px 10px', color: 'var(--text-muted, #7A878E)', fontSize: '12px' }}>
                        {formatDatePK(tx.transactionDate || tx.createdAt)}
                      </td>
                      <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text-primary, #17242D)' }}>
                        {tx.customerId?.name || tx.customerId?.customerCode || 'Walk-in'}
                      </td>
                      <td style={{ padding: '9px 10px', textTransform: 'uppercase', fontWeight: 600, fontSize: '11.5px' }}>
                        {tx.fuelType || '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {tx.fuelQuantity ? formatNumberPK(tx.fuelQuantity, 0, 0) : '—'}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: (tx.totalAmount || 0) > 0 ? 'var(--color-danger, #C64040)' : 'var(--color-success, #18864B)',
                        }}
                      >
                        {formatCurrencyPK(tx.totalAmount || tx.paymentReceived || 0)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <Badge status="completed">Completed</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FileText size={32} />}
              title="No recent transactions"
              description="Fuel sales and customer payments will appear here."
            />
          )}
        </Card>

        {/* Top Customers */}
        <Card
          title="Top Customer Balances"
          icon={<Users size={16} />}
          action={
            <Link
              to="/admin/customers"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-primary, #0B5D4B)',
                textDecoration: 'none',
              }}
            >
              View All →
            </Link>
          }
        >
          {summary?.topCustomers?.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default, #E2E8EC)', textAlign: 'left', color: 'var(--text-secondary, #5B6870)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Customer Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topCustomers.map((c, idx) => (
                    <tr key={c._id || idx} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text-primary, #17242D)' }}>
                        {c.userId?.name || c.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>
                        {c.customerCode || '—'}
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: (c.currentBalance || 0) > 0 ? 'var(--color-danger, #C64040)' : 'var(--color-success, #18864B)',
                        }}
                      >
                        {formatCurrencyPK(c.currentBalance || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Users size={32} />}
              title="No customers found"
              description="Registered customers will appear here."
            />
          )}
        </Card>

        {/* Fuel Stock Summary */}
        <Card
          title="Fuel Stock Summary"
          icon={<Fuel size={16} />}
          action={
            <Link
              to="/admin/fuel-entry"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-primary, #0B5D4B)',
                textDecoration: 'none',
              }}
            >
              Manage →
            </Link>
          }
        >
          {fuelStock.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default, #E2E8EC)', textAlign: 'left', color: 'var(--text-secondary, #5B6870)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Fuel Type</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Opening</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Issued</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelStock.map((s) => (
                    <tr key={s.type} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatNumberPK(s.opening, 0, 0)} L
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-warning, #C47B12)', fontWeight: 600 }}>
                        {formatNumberPK(s.issued, 0, 0)} L
                      </td>
                      <td
                        style={{
                          padding: '9px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: s.balance >= 0 ? 'var(--color-success, #18864B)' : 'var(--color-danger, #C64040)',
                        }}
                      >
                        {formatNumberPK(s.balance, 0, 0)} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Fuel size={32} />}
              title="No fuel stock data"
              description="Add daily fuel entries to track stock balances."
            />
          )}
        </Card>
      </div>
    </div>
  );
}