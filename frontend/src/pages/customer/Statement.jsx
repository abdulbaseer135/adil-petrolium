import React, { useEffect, useState } from 'react';
import { getMyProfile } from '../../api/customerApi';
import { BalanceCard } from '../../components/customer/BalanceCard';
import { StatementDownload } from '../../components/customer/StatementDownload';
import { SkeletonCard } from '../../components/ui/Skeleton';

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
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Account Statement</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: 640 }}>
          Generate and download your account statement as an Excel file. Use the date fields below to export the exact period you need.
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        profile && (
          <>
            <BalanceCard balance={profile.currentBalance} customerCode={profile.customerCode} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '20px',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Account Details</div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--color-text)' }}>
                  <div><strong>Name:</strong> {profile.userId?.name || profile.name || '-'}</div>
                  <div><strong>Code:</strong> {profile.customerCode || '-'}</div>
                  <div><strong>Email:</strong> {profile.userId?.email || '-'}</div>
                  <div><strong>Phone:</strong> {profile.phone || profile.userId?.phone || '-'}</div>
                  <div><strong>Address:</strong> {profile.address || '-'}</div>
                </div>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '20px',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Statement Summary</div>
                <div style={{ display: 'grid', gap: '10px', fontSize: '13px', color: 'var(--color-text)' }}>
                  <div><strong>Current Balance:</strong> {profile.currentBalance != null ? new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(profile.currentBalance) : '-'}</div>
                  <div><strong>Customer Since:</strong> {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-PK') : '-'}</div>
                  <div><strong>Download:</strong> Use the button below to export.</div>
                </div>
              </div>
            </div>
          </>
        )
      )}

      <StatementDownload customerCode={profile?.customerCode || ''} />
    </div>
  );
}