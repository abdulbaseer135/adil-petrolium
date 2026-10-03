import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCustomers } from '../../api/customerApi';
import { getTransactions } from '../../api/transactionApi';
import { getDaily } from '../../api/reportApi';
import { getAdminLinkRequests } from '../../api/customerPumpApi';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatCurrencyPK, formatNumberPK, toInputDatePK, formatDatePK } from '../../utils/pkFormat';
import '../../styles/adminDashboard.css';

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

  // Formatted date string like: Friday, 2 October 2026
  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Compute 7 days range
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

        // Sort Top Customers by Total Purchases or Balance
        const topCustomers = [...customers]
          .sort((a, b) => (Number(b.currentBalance) || 0) - (Number(a.currentBalance) || 0))
          .slice(0, 5);

        // Sort Recent Transactions (latest first)
        const recent = [...trendTxs, ...todayTxs]
          .filter((v, i, a) => a.findIndex((t) => t._id === v._id) === i)
          .sort((a, b) => new Date(b.transactionDate || b.createdAt) - new Date(a.transactionDate || a.createdAt))
          .slice(0, 6);

        // Aggregate 7-Day Trend Points
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

        // Fuel Stock Calculation (from today's and trend transactions)
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
      <div className="admin-dashboard-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="admin-dashboard-container">
        <ErrorState message={error} />
      </div>
    );
  }

  const fmtRs = (n) => `Rs ${formatNumberPK(n || 0, 0, 0)}`;
  const collectionRate =
    summary?.todayRevenue > 0
      ? Math.round((summary.todayCollected / summary.todayRevenue) * 100)
      : 0;

  // Chart Coordinates Calculation
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

  // Generate SVG path strings
  const salesPath = trendData.length > 0
    ? trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sales)}`).join(' ')
    : `M ${paddingX} ${chartHeight - 20} L ${chartWidth - 15} ${chartHeight - 20}`;

  const collectionsPath = trendData.length > 0
    ? trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.collections)}`).join(' ')
    : `M ${paddingX} ${chartHeight - 20} L ${chartWidth - 15} ${chartHeight - 20}`;

  // Area fill paths
  const salesAreaPath = trendData.length > 0
    ? `${salesPath} L ${getX(trendData.length - 1)} ${chartHeight - 20} L ${getX(0)} ${chartHeight - 20} Z`
    : '';

  const collectionsAreaPath = trendData.length > 0
    ? `${collectionsPath} L ${getX(trendData.length - 1)} ${chartHeight - 20} L ${getX(0)} ${chartHeight - 20} Z`
    : '';

  return (
    <div className="animate-fadeIn">
      {/* ─── Hero Header Row ─── */}
      <div className="admin-hero-row">
        <div className="admin-hero-title-group">
          <h1>
            <span>Overview</span>
            <span role="img" aria-label="Waving hand" style={{ fontSize: '26px' }}>👋</span>
          </h1>
          <p>Monitor your station performance and key activities at a glance.</p>
        </div>

        <div className="admin-hero-actions">
          {/* Date Selector Button */}
          <button className="admin-date-picker-btn" title="Current station date">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{formattedTodayDate}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Generate Report Button */}
          <button
            onClick={() => navigate('/admin/exports')}
            className="admin-primary-btn"
            title="Generate detailed station reports and Excel exports"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* ─── Pending Requests Notification Banner ─── */}
      {pendingLinkCount > 0 && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(249, 115, 22, 0.03) 100%)',
            border: '1px solid rgba(234, 88, 12, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                {pendingLinkCount} Pending Customer Connection Request{pendingLinkCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Review and approve customer account requests to enable online balances and ledgers.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/customer-requests')}
            className="admin-primary-btn"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              background: '#ea580c',
              borderColor: '#ea580c',
            }}
          >
            Review Requests ({pendingLinkCount}) →
          </button>
        </div>
      )}

      {/* ─── Row 1: 4 KPI Cards (Matching Mockup) ─── */}
      <div className="admin-kpi-grid">
        {/* Card 1: Active Customers (Blue) */}
        <div className="admin-kpi-card kpi-blue">
          <div className="kpi-header">
            <div className="kpi-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span className="kpi-label">Active Customers</span>
          </div>

          <div className="kpi-body">
            <div className="kpi-metric-val">{summary?.customersCount ?? 0}</div>
          </div>

          <div className="kpi-footer">
            <span className="kpi-pill-badge trend-up">▲ +0%</span>
            <span className="kpi-subtext">Registered accounts</span>
          </div>

          <div className="kpi-watermark" aria-hidden="true">
            👥
          </div>
        </div>

        {/* Card 2: Total Outstanding (Red) */}
        <div className="admin-kpi-card kpi-red">
          <div className="kpi-header">
            <div className="kpi-icon-badge">
              <span>Rs</span>
            </div>
            <span className="kpi-label">Total Outstanding</span>
          </div>

          <div className="kpi-body">
            <div className="kpi-metric-val">{fmtRs(summary?.totalOutstanding)}</div>
          </div>

          <div className="kpi-footer">
            <span className="kpi-pill-badge trend-down">▲ +0%</span>
            <span className="kpi-subtext">{summary?.customersWithDebt ?? 0} customers</span>
          </div>

          <div className="kpi-watermark" aria-hidden="true">
            💳
          </div>
        </div>

        {/* Card 3: Today's Sales (Amber/Gold) */}
        <div className="admin-kpi-card kpi-amber">
          <div className="kpi-header">
            <div className="kpi-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/>
                <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>
                <circle cx="9" cy="9" r="2"/>
              </svg>
            </div>
            <span className="kpi-label">Today's Sales</span>
          </div>

          <div className="kpi-body">
            <div className="kpi-metric-val">{fmtRs(summary?.todayRevenue)}</div>
          </div>

          <div className="kpi-footer">
            <span className="kpi-pill-badge trend-up">▲ +0%</span>
            <span className="kpi-subtext">{summary?.todayTxCount ?? 0} transactions</span>
          </div>

          <div className="kpi-watermark" aria-hidden="true">
            📊
          </div>
        </div>

        {/* Card 4: Today's Collections (Green) */}
        <div className="admin-kpi-card kpi-green">
          <div className="kpi-header">
            <div className="kpi-icon-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                <circle cx="12" cy="12" r="2"></circle>
                <path d="M6 12h.01M18 12h.01"></path>
              </svg>
            </div>
            <span className="kpi-label">Today's Collections</span>
          </div>

          <div className="kpi-body">
            <div className="kpi-metric-val">{fmtRs(summary?.todayCollected)}</div>
          </div>

          <div className="kpi-footer">
            <span className="kpi-pill-badge trend-up">▲ +0%</span>
            <span className="kpi-subtext">{collectionRate}% collection rate</span>
          </div>

          <div className="kpi-watermark" aria-hidden="true">
            %
          </div>
        </div>
      </div>

      {/* ─── Row 2: Middle Section (Sales & Collections Trend + Quick Actions) ─── */}
      <div className="admin-middle-grid">
        {/* Left: Sales & Collections Trend Chart */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <div className="admin-card-header-icon" style={{ background: 'var(--color-primary-soft, #EAF5F1)', color: 'var(--color-primary, #0B5D4B)' }}>
                📊
              </div>
              <div>
                <div className="admin-card-title">Sales & Collections Trend</div>
                <div className="admin-card-subtitle">Last 7 days overview</div>
              </div>
            </div>

            <div className="admin-chart-controls">
              <div className="admin-chart-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--color-primary, #0B5D4B)' }}></span>
                  <span>Sales (Rs)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: 'var(--color-secondary, #1F3A4D)' }}></span>
                  <span>Collections (Rs)</span>
                </div>
              </div>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="admin-select-sm"
                aria-label="Select trend time range"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="admin-chart-container">
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

              {/* Horizontal Gridlines & Y-Axis Labels */}
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
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={step > 0 ? '3 3' : 'none'}
                    />
                    <text
                      x={paddingX - 8}
                      y={yPos + 3.5}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9.5"
                      fontFamily="Inter, sans-serif"
                    >
                      Rs {displayVal}
                    </text>
                  </g>
                );
              })}

              {/* Area Under Lines */}
              {salesAreaPath && <path d={salesAreaPath} fill="url(#salesGlow)" />}
              {collectionsAreaPath && <path d={collectionsAreaPath} fill="url(#collectionsGlow)" />}

              {/* Data Path Lines */}
              <path
                d={salesPath}
                fill="none"
                stroke="#0B5D4B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={collectionsPath}
                fill="none"
                stroke="#1F3A4D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points and X-Axis Labels */}
              {trendData.map((d, i) => {
                const cx = getX(i);
                const cySales = getY(d.sales);
                const cyCol = getY(d.collections);

                return (
                  <g key={d.date || i}>
                    {/* X-axis date label */}
                    <text
                      x={cx}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="Inter, sans-serif"
                      fontWeight="500"
                    >
                      {d.label}
                    </text>

                    {/* Sales Dot */}
                    <circle
                      cx={cx}
                      cy={cySales}
                      r="4"
                      fill="#ffffff"
                      stroke="#0B5D4B"
                      strokeWidth="2"
                    >
                      <title>{`Sales: Rs ${d.sales}`}</title>
                    </circle>

                    {/* Collections Dot */}
                    <circle
                      cx={cx}
                      cy={cyCol}
                      r="4"
                      fill="#ffffff"
                      stroke="#1F3A4D"
                      strokeWidth="2"
                    >
                      <title>{`Collections: Rs ${d.collections}`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Quick Actions (2x2 Grid) */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ marginBottom: 16 }}>
            <div className="admin-card-title-group">
              <div className="admin-card-header-icon" style={{ background: 'var(--color-primary-soft, #EAF5F1)', color: 'var(--color-primary, #0B5D4B)' }}>
                ⚡
              </div>
              <div>
                <div className="admin-card-title">Quick Actions</div>
                <div className="admin-card-subtitle">Common tasks to manage your station</div>
              </div>
            </div>
          </div>

          <div className="admin-quick-actions-grid">
            {/* Tile 1: Add Fuel Entry */}
            <Link to="/admin/fuel-entry" className="admin-action-tile tile-blue" title="Record fuel sale">
              <div className="admin-action-content">
                <span className="admin-action-icon">⛽</span>
                <span className="admin-action-label">Add Fuel Entry</span>
              </div>
              <span className="admin-action-arrow">→</span>
            </Link>

            {/* Tile 2: Register Customer */}
            <Link to="/admin/customers/create" className="admin-action-tile tile-green" title="Create customer account">
              <div className="admin-action-content">
                <span className="admin-action-icon">👤+</span>
                <span className="admin-action-label">Register Customer</span>
              </div>
              <span className="admin-action-arrow">→</span>
            </Link>

            {/* Tile 3: View Transactions */}
            <Link to="/admin/transactions" className="admin-action-tile tile-purple" title="Open station transactions ledger">
              <div className="admin-action-content">
                <span className="admin-action-icon">📄</span>
                <span className="admin-action-label">View Transactions</span>
              </div>
              <span className="admin-action-arrow">→</span>
            </Link>

            {/* Tile 4: Daily Record */}
            <Link to="/admin/daily-record" className="admin-action-tile tile-orange" title="View or lock daily record">
              <div className="admin-action-content">
                <span className="admin-action-icon">📊</span>
                <span className="admin-action-label">Daily Record</span>
              </div>
              <span className="admin-action-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Row 3: Three Data Panels / Tables ─── */}
      <div className="admin-bottom-grid">
        {/* Panel 1: Recent Transactions */}
        <div className="admin-data-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <div className="admin-card-header-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                📄
              </div>
              <div className="admin-card-title">Recent Transactions</div>
            </div>
            <Link to="/admin/transactions" className="admin-card-btn-link">View All</Link>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="admin-micro-table-wrap">
              <table className="admin-micro-table">
                <thead>
                  <tr>
                    <th>Sl#</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Fuel</th>
                    <th style={{ textAlign: 'right' }}>Litres</th>
                    <th style={{ textAlign: 'right' }}>Amount (Rs)</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={tx._id || idx}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td>{formatDatePK(tx.transactionDate || tx.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{tx.customerId?.name || tx.customerId?.customerCode || 'Walk-in'}</td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: 11 }}>
                          {tx.fuelType || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{tx.fuelQuantity ? formatNumberPK(tx.fuelQuantity, 0, 0) : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: (tx.totalAmount || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatCurrencyPK(tx.totalAmount || tx.paymentReceived || 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state-box">
              <div className="admin-empty-icon">📑</div>
              <div className="admin-empty-title">No transactions found</div>
              <div className="admin-empty-subtitle">Transactions will appear here once fuel entries are added.</div>
            </div>
          )}
        </div>

        {/* Panel 2: Top Customers */}
        <div className="admin-data-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <div className="admin-card-header-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                👥
              </div>
              <div className="admin-card-title">Top Customers</div>
            </div>
            <Link to="/admin/customers" className="admin-card-btn-link">View All</Link>
          </div>

          {summary?.topCustomers?.length > 0 ? (
            <div className="admin-micro-table-wrap">
              <table className="admin-micro-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th style={{ textAlign: 'right' }}>Balance (Rs)</th>
                    <th style={{ textAlign: 'center' }}>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topCustomers.map((c, idx) => (
                    <tr key={c._id || idx}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{c.userId?.name || c.name || 'Unknown'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: (c.currentBalance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatCurrencyPK(c.currentBalance || 0)}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {c.customerCode || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state-box">
              <div className="admin-empty-icon">👥</div>
              <div className="admin-empty-title">No customers found</div>
              <div className="admin-empty-subtitle">Registered customers will appear here.</div>
            </div>
          )}
        </div>

        {/* Panel 3: Fuel Stock Summary */}
        <div className="admin-data-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <div className="admin-card-header-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                ⛽
              </div>
              <div className="admin-card-title">Fuel Stock Summary</div>
            </div>
            <Link to="/admin/fuel-entry" className="admin-card-btn-link">Manage</Link>
          </div>

          {fuelStock.length > 0 ? (
            <div className="admin-micro-table-wrap">
              <table className="admin-micro-table">
                <thead>
                  <tr>
                    <th>Fuel Type</th>
                    <th style={{ textAlign: 'right' }}>Opening</th>
                    <th style={{ textAlign: 'right' }}>Issued</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelStock.map((s) => (
                    <tr key={s.type}>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumberPK(s.opening, 0, 0)} L</td>
                      <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 600 }}>{formatNumberPK(s.issued, 0, 0)} L</td>
                      <td style={{ textAlign: 'right', fontWeight: 750, color: s.balance >= 0 ? '#16a34a' : '#dc2626' }}>
                        {formatNumberPK(s.balance, 0, 0)} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state-box">
              <div className="admin-empty-icon">⛽</div>
              <div className="admin-empty-title">No fuel stock data</div>
              <div className="admin-empty-subtitle">Add fuel entries to see stock summary.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}