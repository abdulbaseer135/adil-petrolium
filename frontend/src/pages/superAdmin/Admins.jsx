import React, { useEffect, useState } from 'react';
import { Fuel, UserCheck } from 'lucide-react';
import { getPlatformAdmins } from '../../api/superAdminApi';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const res = await getPlatformAdmins();
        setAdmins(res.data.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to fetch platform admins');
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Station Administrators"
        subtitle="Platform-wide registry of petrol pump administrators and station managers."
      />

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading administrators...
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : admins.length === 0 ? (
          <EmptyState
            icon={<UserCheck size={36} />}
            title="No administrators found"
            description="Registered station administrators will appear here."
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
                  <th style={{ padding: '10px 14px' }}>Administrator</th>
                  <th style={{ padding: '10px 14px' }}>Contact Phone</th>
                  <th style={{ padding: '10px 14px' }}>Assigned Station</th>
                  <th style={{ padding: '10px 14px' }}>Account Status</th>
                  <th style={{ padding: '10px 14px' }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                      <div>{admin.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #7A878E)', fontWeight: 400 }}>
                        {admin.email}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #5B6870)' }}>
                      {admin.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                      {admin.petrolPumpId?.name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                          <Fuel size={14} color="var(--color-primary, #0B5D4B)" />
                          <span>{admin.petrolPumpId.name}</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            ({admin.petrolPumpId.city})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge status={admin.status || 'active'}>{admin.status || 'Active'}</Badge>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted, #7A878E)', fontSize: '12.5px' }}>
                      {new Date(admin.createdAt).toLocaleDateString()}
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
