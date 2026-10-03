import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { getMyProfile } from '../../api/customerApi';
import { BalanceCard } from '../../components/customer/BalanceCard';
import { StatementDownload } from '../../components/customer/StatementDownload';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import { formatMoneyPK, formatDatePK } from '../../utils/pkFormat';

export default function Statement() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProfile()
      .then((r) => setProfile(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Account Statement"
        subtitle="Generate and download your account statement as an Excel file for any selected period."
      />

      {loading ? (
        <SkeletonCard />
      ) : (
        profile && (
          <>
            <BalanceCard balance={profile.currentBalance} customerCode={profile.customerCode} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                gap: '16px',
              }}
            >
              <Card title="Account Details">
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <div><strong>Name:</strong> {profile.userId?.name || profile.name || '—'}</div>
                  <div><strong>Code:</strong> {profile.customerCode || '—'}</div>
                  <div><strong>Email:</strong> {profile.userId?.email || '—'}</div>
                  <div><strong>Phone:</strong> {profile.phone || profile.userId?.phone || '—'}</div>
                  <div><strong>Address:</strong> {profile.address || '—'}</div>
                </div>
              </Card>

              <Card title="Statement Summary">
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <div><strong>Current Balance:</strong> {profile.currentBalance != null ? formatMoneyPK(profile.currentBalance) : '—'}</div>
                  <div><strong>Customer Since:</strong> {profile.createdAt ? formatDatePK(profile.createdAt) : '—'}</div>
                  <div><strong>Export:</strong> Use the generator below to export Excel workbooks.</div>
                </div>
              </Card>
            </div>
          </>
        )
      )}

      <Card
        title="Generate Statement File"
        subtitle="Select an optional date range to filter transactions, or download your complete history."
        icon={<Download size={16} />}
      >
        <StatementDownload customerCode={profile?.customerCode || ''} />
      </Card>
    </div>
  );
}