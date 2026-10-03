import React, { useEffect, useState } from 'react';
import { getPlatformCustomers } from '../../api/superAdminApi';

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
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
          Platform Customers
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Platform-wide customer identities and multi-pump account counts
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
            Loading platform customers...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-error)', textAlign: 'center' }}>
            {error}
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No registered customers found.
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
                  <th style={{ padding: '12px 14px' }}>Customer Name</th>
                  <th style={{ padding: '12px 14px' }}>Email Address</th>
                  <th style={{ padding: '12px 14px' }}>Registered Phone</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                      {c.email}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                      {c.phone || '—'}
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
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                        }}
                      >
                        {c.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
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
