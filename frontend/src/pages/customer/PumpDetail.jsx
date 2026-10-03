import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getPumpAccountDetail,
  getPumpAccountTransactions,
} from '../../api/customerPumpApi';
import { BalanceCard } from '../../components/customer/BalanceCard';
import { Ledger } from '../../components/customer/Ledger';
import { StatementDownload } from '../../components/customer/StatementDownload';
import { DateRangeFilter } from '../../components/common/DateRangeFilter';
import { usePagination } from '../../hooks/usePagination';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';

export default function PumpDetail() {
  const { pumpAccountId } = useParams();
  const [detail, setDetail] = useState(null);
  const [txs, setTxs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filter, setFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { page, limit, goTo } = usePagination(20);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [detailRes, txRes] = await Promise.all([
        getPumpAccountDetail(pumpAccountId),
        getPumpAccountTransactions(pumpAccountId, { ...filter, page, limit }),
      ]);
      setDetail(detailRes.data.data);
      setTxs(txRes.data.data || []);
      setMeta(txRes.data.meta);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load station account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pumpAccountId, filter, page, limit]);

  if (loading && !detail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div
        style={{
          background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
          padding: '24px',
          borderRadius: '16px',
          color: 'var(--color-error)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: '15px' }}>{error}</p>
        <Link to="/dashboard">
          <Button variant="secondary">Back to My Petrol Pumps</Button>
        </Link>
      </div>
    );
  }

  const { account, pump } = detail || {};

  return (
    <div
      className="animate-fadeIn"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          style={{
            fontSize: '13px',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '8px',
          }}
        >
          ← Back to All Petrol Pumps
        </Link>
      </div>

      {/* Station Header Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⛽</span>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              {pump?.name || 'Petrol Pump Station'}
            </h1>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginTop: '6px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <span>📍 {pump?.address ? `${pump.address}, ` : ''}{pump?.city || ''}</span>
            {pump?.businessPhone && <span>📞 {pump.businessPhone}</span>}
            {pump?.businessEmail && <span>✉️ {pump.businessEmail}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Station Customer Code
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--color-primary)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >
            {account?.customerCode}
          </div>
        </div>
      </div>

      {/* Balance Card */}
      {account && (
        <BalanceCard
          balance={account.currentBalance}
          customerCode={account.customerCode}
          creditLimit={account.creditLimit}
        />
      )}

      {/* Statement Download Widget */}
      {account && (
        <StatementDownload
          customerCode={account.customerCode}
          pumpAccountId={account._id}
        />
      )}

      {/* Date Filter */}
      <DateRangeFilter onFilter={(f) => setFilter(f)} />

      {/* Transactions Ledger */}
      <Ledger
        transactions={txs}
        loading={loading}
        error={error}
        meta={meta}
        onPageChange={goTo}
        onRetry={() => loadData(false)}
      />
    </div>
  );
}
