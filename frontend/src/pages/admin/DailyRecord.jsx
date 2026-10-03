import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Fuel, DollarSign, CreditCard, TrendingUp, AlertCircle, FolderOpen, Calendar, Search } from 'lucide-react';
import { getDaily, lockDailyRecord } from '../../api/reportApi';
import { getTransactions } from '../../api/transactionApi';
import { Button } from '../../components/ui/Button';
import { EmptyState }    from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CustomerStatementGroups, buildCustomerStatementGroups, filterCustomerStatementGroups } from '../../components/admin/CustomerStatementGroups';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/dashboard/StatCard';
import { formatDatePK, formatNumberPK, toInputDatePK, formatCurrencyShortPK } from '../../utils/pkFormat';

const fmt     = formatCurrencyShortPK;
const fmtL    = (v) => `${formatNumberPK(v, 0, 0)} L`;
const fmtDate = formatDatePK;

const localToday = () => toInputDatePK(new Date());

export default function DailyRecord() {
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [record,        setRecord]       = useState(null);
  const [dayTransactions, setDayTransactions] = useState([]);
  const [dailySummary,  setDailySummary]  = useState({
    totalFuelSold: 0,
    totalSalesAmount: 0,
    totalPaymentsReceived: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingRecord, setLoadingRecord]= useState(true);
  const [summaryError,  setSummaryError] = useState('');
  const [recordError,    setRecordError]  = useState('');
  const [transactionsError, setTransactionsError] = useState('');
  const [lockTarget,    setLockTarget]   = useState(null);
  const [lockLoading,   setLockLoading]  = useState(false);
  const [dateReady,     setDateReady]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');

  const todayStr = useMemo(() => toInputDatePK(), []);

  const loadDailySummary = useCallback(async () => {
    setLoadingSummary(true); setSummaryError('');
    try {
      const allTransactions = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await getTransactions({
          startDate: selectedDate,
          endDate: selectedDate,
          page,
          limit: 100,
          sort: 'transactionDate',
        });
        allTransactions.push(...(res.data?.data || []));
        totalPages = res.data?.meta?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      const summary = allTransactions.reduce((acc, tx) => {
        acc.totalFuelSold += Number(tx.fuelQuantity) || 0;
        acc.totalSalesAmount += Number(tx.totalAmount) || 0;
        acc.totalPaymentsReceived += Number(tx.paymentReceived) || 0;
        return acc;
      }, { totalFuelSold: 0, totalSalesAmount: 0, totalPaymentsReceived: 0 });

      setDailySummary(summary);
    } catch (err) {
      setSummaryError(err.response?.data?.message || 'Failed to load daily totals');
      setDailySummary({ totalFuelSold: 0, totalSalesAmount: 0, totalPaymentsReceived: 0 });
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedDate]);

  const loadDayTransactions = useCallback(async () => {
    setLoadingTransactions(true); setTransactionsError('');
    try {
      const all = [];
      let page = 1;
      let totalPages = 1;

      do {
        const res = await getTransactions({
          startDate: selectedDate,
          endDate: selectedDate,
          page,
          limit: 100,
          sort: 'transactionDate',
        });
        all.push(...(res.data?.data || []));
        totalPages = res.data?.meta?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setDayTransactions(all.filter((tx) => !tx.isVoided));
    } catch (err) {
      setTransactionsError(err.response?.data?.message || 'Failed to load buyer-wise details');
      setDayTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [selectedDate]);

  const loadRecord = useCallback(async () => {
    setLoadingRecord(true); setRecordError('');
    try {
      const res = await getDaily({ date: selectedDate });
      setRecord(res.data.data || res.data);
    } catch (err) {
      setRecordError(err.response?.data?.message || 'Failed to load daily record');
      setRecord(null);
    } finally { setLoadingRecord(false); }
  }, [selectedDate]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const latestTransactionsRes = await getTransactions({ page: 1, limit: 1, sort: '-transactionDate' });
      if (cancelled) return;

      const latestTransaction = latestTransactionsRes.data?.data?.[0];
      const bootstrapDate = latestTransaction?.transactionDate;

      if (bootstrapDate) {
        setSelectedDate(toInputDatePK(bootstrapDate));
      }

      setDateReady(true);
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dateReady) return;
    loadDailySummary();
    loadDayTransactions();
    loadRecord();
  }, [dateReady, loadDailySummary, loadDayTransactions, loadRecord]);

  const handleLock = async () => {
    if (!lockTarget) return;
    setLockLoading(true);
    try {
      await lockDailyRecord(lockTarget._id);
      setLockTarget(null);
      await Promise.all([loadRecord(), loadDailySummary(), loadDayTransactions()]);
    } catch (err) {
      setRecordError(err.response?.data?.message || 'Failed to lock daily record');
    } finally { setLockLoading(false); }
  };

  const loading = loadingSummary || loadingTransactions || loadingRecord;
  const statementGroups = useMemo(() => buildCustomerStatementGroups(dayTransactions), [dayTransactions]);
  const filteredStatementGroups = useMemo(
    () => filterCustomerStatementGroups(statementGroups, searchQuery),
    [statementGroups, searchQuery]
  );

  return (
    <>
      <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PageHeader
          title="Daily Record"
          subtitle="Review and lock the daily summary for a specific operational date"
          actions={
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={todayStr}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {record && !record.isLocked ? (
                <Button variant="danger" onClick={() => setLockTarget(record)}>
                  <Lock size={15} />
                  <span>Lock Record</span>
                </Button>
              ) : null}
            </div>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <StatCard
            title="Total Sale"
            value={loadingSummary ? 'Loading…' : fmt(dailySummary.totalSalesAmount)}
            icon={<DollarSign size={20} />}
            description="Debit transactions on selected date"
          />
          <StatCard
            title="Total Fuel Sold"
            value={loadingSummary ? 'Loading…' : fmtL(dailySummary.totalFuelSold)}
            icon={<Fuel size={20} />}
            description="Total litres sold across entries"
          />
          <StatCard
            title="Total Payments"
            value={loadingSummary ? 'Loading…' : fmt(dailySummary.totalPaymentsReceived)}
            icon={<CreditCard size={20} />}
            description="Credit transactions received"
          />
          <StatCard
            title="Net Balance"
            value={loadingSummary ? 'Loading…' : fmt(dailySummary.totalSalesAmount - dailySummary.totalPaymentsReceived)}
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

        {summaryError || transactionsError || recordError ? (
          <EmptyState
            icon={<AlertCircle size={32} color="var(--color-danger)" />}
            title="Could not load daily record"
            description={summaryError || transactionsError || recordError}
            action={() => Promise.all([loadDailySummary(), loadDayTransactions(), loadRecord()])}
            actionLabel="Try Again"
          />
        ) : (
          <CustomerStatementGroups
            groups={filteredStatementGroups}
            loading={loading}
            error={''}
            onRetry={() => Promise.all([loadDailySummary(), loadDayTransactions(), loadRecord()])}
            emptyIcon={<FolderOpen size={36} color="var(--text-muted)" />}
            emptyTitle="No record for this date"
            emptyDescription="Select a date that has transactions to view its customer statements."
          />
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={Boolean(lockTarget)}
        title="Lock daily record"
        message={
          lockTarget
            ? `Lock the daily record for ${fmtDate(lockTarget.date)}? This prevents further edits.`
            : ''
        }
        confirmLabel={lockLoading ? 'Locking...' : 'Lock Record'}
        danger
        onCancel={() => { if (!lockLoading) setLockTarget(null); }}
        onConfirm={handleLock}
      />
    </>
  );
}