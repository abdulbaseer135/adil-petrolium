import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Fuel,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Download,
} from 'lucide-react';
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
import Card from '../../components/ui/Card';

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div
        style={{
          background: 'var(--color-danger-bg, #FDEEEE)',
          border: '1px solid var(--color-danger-border, #F7CACA)',
          padding: '24px',
          borderRadius: 'var(--radius-lg, 12px)',
          color: 'var(--color-danger, #C64040)',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          style={{
            fontSize: '13px',
            color: 'var(--color-primary, #0B5D4B)',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to All Petrol Pumps</span>
        </Link>
      </div>

      {/* Station Header Card */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md, 8px)',
                  background: 'var(--color-primary-soft, #EAF5F1)',
                  color: 'var(--color-primary, #0B5D4B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Fuel size={20} />
              </div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary, #17242D)',
                }}
              >
                {pump?.name || 'Petrol Pump Station'}
              </h1>
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary, #5B6870)',
                marginTop: '8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} color="var(--text-muted)" />
                {pump?.address ? `${pump.address}, ` : ''}{pump?.city || ''}
              </span>
              {pump?.businessPhone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={14} color="var(--text-muted)" />
                  {pump.businessPhone}
                </span>
              )}
              {pump?.businessEmail && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={14} color="var(--text-muted)" />
                  {pump.businessEmail}
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #7A878E)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Station Customer Code
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-primary, #0B5D4B)',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                marginTop: '2px',
              }}
            >
              {account?.customerCode}
            </div>
          </div>
        </div>
      </Card>

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
        <Card
          title="Download Statement"
          subtitle="Export transactions for this station to Excel"
          icon={<Download size={16} />}
        >
          <StatementDownload
            customerCode={account.customerCode}
            pumpAccountId={account._id}
          />
        </Card>
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
