import React, { useEffect, useState } from 'react';
import { getPlatformAdmins } from '../../api/superAdminApi';

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
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
          Station Administrators
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Platform-wide registry of petrol pump administrators and station managers
        </p>
      </div>

      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading administrators...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-error)', textAlign: 'center' }}>
            {error}
          </div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No administrators found.
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 640 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    textAlign: 'left',
                    color: 'var(--color-text-muted)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Administrator</th>
                  <th style={{ padding: '12px 14px' }}>Contact Phone</th>
                  <th style={{ padding: '12px 14px' }}>Assigned Station</th>
                  <th style={{ padding: '12px 14px' }}>Account Status</th>
                  <th style={{ padding: '12px 14px' }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div>{admin.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                        {admin.email}
                      </div>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                      {admin.phone || '—'}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text)' }}>
                      {admin.petrolPumpId?.name ? (
                        <div style={{ fontWeight: 500 }}>
                          ⛽ {admin.petrolPumpId.name}
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>
                            {admin.petrolPumpId.city}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background:
                            admin.status === 'approved' || admin.status === 'active'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : admin.status === 'pending'
                              ? 'rgba(234, 179, 8, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                          color:
                            admin.status === 'approved' || admin.status === 'active'
                              ? '#059669'
                              : admin.status === 'pending'
                              ? '#ca8a04'
                              : '#dc2626',
                        }}
                      >
                        {admin.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
