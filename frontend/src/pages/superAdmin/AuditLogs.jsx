import React, { useEffect, useState } from 'react';
import { getPlatformAuditLogs } from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      const res = await getPlatformAuditLogs(params);
      setLogs(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch platform audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
            Platform Audit Trail
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Tamper-evident logs of administrative, approval, financial, and security actions across all tenants
          </p>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
          >
            <option value="">All Platform Actions</option>
            <option value="PETROL_PUMP_REGISTERED">Pump Registered</option>
            <option value="PETROL_PUMP_APPROVED">Pump Approved</option>
            <option value="PETROL_PUMP_REJECTED">Pump Rejected</option>
            <option value="PETROL_PUMP_SUSPENDED">Pump Suspended</option>
            <option value="PETROL_PUMP_REACTIVATED">Pump Reactivated</option>
            <option value="CUSTOMER_ACCOUNT_LINKED">Customer Account Linked</option>
            <option value="TRANSACTION_CREATED">Transaction Created</option>
            <option value="TRANSACTION_VOIDED">Transaction Voided</option>
          </select>
        </div>
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
            Loading audit logs...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-error)', textAlign: 'center' }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No audit records match the selected criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 720 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    textAlign: 'left',
                    color: 'var(--color-text-muted)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                  <th style={{ padding: '12px 14px' }}>Actor</th>
                  <th style={{ padding: '12px 14px' }}>Station Tenant</th>
                  <th style={{ padding: '12px 14px' }}>Target</th>
                  <th style={{ padding: '12px 14px' }}>IP / Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: log.action.includes('REJECT') || log.action.includes('SUSPEND')
                            ? 'rgba(239, 68, 68, 0.1)'
                            : log.action.includes('APPROVE')
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(79, 70, 229, 0.08)',
                          color: log.action.includes('REJECT') || log.action.includes('SUSPEND')
                            ? '#dc2626'
                            : log.action.includes('APPROVE')
                            ? '#059669'
                            : 'var(--color-primary)',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                        {log.actorEmail || 'System / Service'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Role: {log.actorRole || 'system'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {log.petrolPumpId?.name ? (
                        <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          ⛽ {log.petrolPumpId.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Platform Level</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                      {log.targetType || log.targetModel || '—'}: {log.targetId ? String(log.targetId).slice(-6) : ''}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '11px' }}>
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            <div>
              Page {meta.page} of {meta.totalPages} ({meta.total} total events)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                disabled={meta.page <= 1}
                onClick={() => fetchLogs(meta.page - 1)}
                variant="secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Previous
              </Button>
              <Button
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchLogs(meta.page + 1)}
                variant="secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
