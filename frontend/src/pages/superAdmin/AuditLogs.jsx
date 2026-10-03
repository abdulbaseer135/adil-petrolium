import React, { useEffect, useState } from 'react';
import { Fuel, ShieldCheck } from 'lucide-react';
import { getPlatformAuditLogs } from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';

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

  const getActionBadgeVariant = (action) => {
    if (action.includes('REJECT') || action.includes('SUSPEND') || action.includes('VOID')) {
      return 'danger';
    }
    if (action.includes('APPROVE') || action.includes('REACTIVATE')) {
      return 'success';
    }
    if (action.includes('REGISTER') || action.includes('LINK')) {
      return 'primary';
    }
    return 'neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Platform Audit Trail"
        subtitle="Tamper-evident logs of administrative, approval, financial, and security actions across all tenants."
        actions={
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-default, #E2E8EC)',
              background: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-primary, #17242D)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
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
        }
      />

      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading audit logs...
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={36} />}
            title="No audit records found"
            description="No audit trail events match the selected criteria."
          />
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 720 }}>
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
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Action</th>
                  <th style={{ padding: '10px 14px' }}>Actor</th>
                  <th style={{ padding: '10px 14px' }}>Station Tenant</th>
                  <th style={{ padding: '10px 14px' }}>Target</th>
                  <th style={{ padding: '10px 14px' }}>IP / Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted, #7A878E)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #17242D)' }}>
                        {log.actorEmail || 'System / Service'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #7A878E)' }}>
                        Role: {log.actorRole || 'system'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {log.petrolPumpId?.name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, color: 'var(--text-primary)' }}>
                          <Fuel size={14} color="var(--color-primary, #0B5D4B)" />
                          <span>{log.petrolPumpId.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #7A878E)' }}>Platform Level</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary, #5B6870)', fontSize: '12px' }}>
                      {log.targetType || log.targetModel || '—'}: {log.targetId ? String(log.targetId).slice(-6) : ''}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted, #7A878E)', fontSize: '11.5px' }}>
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
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-divider, #E8ECEF)',
              fontSize: '13px',
              color: 'var(--text-secondary, #5B6870)',
            }}
          >
            <div>
              Page {meta.page} of {meta.totalPages} ({meta.total} total events)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                disabled={meta.page <= 1}
                onClick={() => fetchLogs(meta.page - 1)}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <Button
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchLogs(meta.page + 1)}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
