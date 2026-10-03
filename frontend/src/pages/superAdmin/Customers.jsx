import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { getPlatformCustomers } from '../../api/superAdminApi';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await getPlatformCustomers();
        setCustomers(res.data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to fetch global customers');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Platform Customers"
        subtitle="Platform-wide customer identities and multi-pump account counts."
      />

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading platform customers...
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users size={36} />}
            title="No registered customers found"
            description="Customers will appear here once registered on the platform."
          />
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 640 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-default, #E2E8EC)',
                    background: 'var(--bg-surface-secondary, #F9FAFB)',
                    textAlign: 'left',
                    color: 'var(--text-secondary, #5B6870)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 14px' }}>Customer Name</th>
                  <th style={{ padding: '10px 14px' }}>Email Address</th>
                  <th style={{ padding: '10px 14px' }}>Registered Phone</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #5B6870)' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #5B6870)' }}>
                      {c.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge status={c.status || 'active'}>{c.status || 'Active'}</Badge>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted, #7A878E)', fontSize: '12.5px' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
