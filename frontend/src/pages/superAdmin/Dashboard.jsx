import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getSuperAdminDashboard,
  approvePetrolPump,
  rejectPetrolPump,
} from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSuperAdminDashboard();
      setData(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load platform dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApprove = async (pumpId) => {
    try {
      setActionLoading(pumpId);
      await approvePetrolPump(pumpId);
      await fetchDashboard();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (pumpId) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(pumpId);
      await rejectPetrolPump(pumpId, reason);
      await fetchDashboard();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reject petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading platform dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
          padding: '16px',
          borderRadius: '12px',
          color: 'var(--color-error)',
        }}
      >
        {error}
        <Button onClick={fetchDashboard} style={{ marginTop: '12px' }}>
          Retry
        </Button>
      </div>
    );
  }

  const overview = data?.overview || data?.stats || {};
  const pendingPumps = data?.pendingPumps || [];
  const recentActivity = data?.recentActivity || data?.recentAuditLogs || [];

  const totalStations = overview.totalPetrolPumps ?? overview.totalPumps ?? 0;
  const pendingApprovalsCount = overview.pendingApprovals ?? overview.pendingPumps ?? 0;
  const activeStations = overview.activePumps ?? overview.approvedPumps ?? overview.approvedPetrolPumps ?? 0;
  const suspendedStations = overview.suspendedPumps ?? 0;
  const totalAdminsCount = overview.totalAdmins ?? 0;
  const totalCustomersCount = overview.totalCustomers ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
            Platform Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(12px, 2.5vw, 14px)', color: 'var(--color-text-muted)' }}>
            Multi-tenant SaaS oversight, station approvals, and system-wide operational metrics
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="kpi-grid">
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Stations
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-text)', marginTop: '6px' }}>
            {totalStations}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-warning, #C47B12)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pending Approvals
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-warning, #C47B12)', marginTop: '6px' }}>
            {pendingApprovalsCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-success, #18864B)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Active Stations
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-success, #18864B)', marginTop: '6px' }}>
            {activeStations}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-danger, #C64040)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Suspended Stations
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-danger, #C64040)', marginTop: '6px' }}>
            {suspendedStations}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Station Admins
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-text)', marginTop: '6px' }}>
            {totalAdminsCount}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: 'clamp(14px, 3vw, 20px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Global Customers
          </div>
          <div style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 750, color: 'var(--color-text)', marginTop: '6px' }}>
            {totalCustomersCount}
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          padding: 'clamp(16px, 3vw, 22px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
              Pending Station Registrations ({pendingPumps.length})
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              New applications requiring Super Admin review and verification
            </p>
          </div>
          <Link
            to="/super-admin/petrol-pumps?status=pending"
            style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            View all pumps →
          </Link>
        </div>

        {pendingPumps.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            🎉 All registrations have been reviewed. No pending approvals!
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive desktop-only" style={{ display: 'block' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Station Name</th>
                    <th style={{ padding: '10px 12px' }}>Location</th>
                    <th style={{ padding: '10px 12px' }}>Owner / Admin</th>
                    <th style={{ padding: '10px 12px' }}>Contact</th>
                    <th style={{ padding: '10px 12px' }}>Submitted At</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPumps.map((pump) => (
                    <tr key={pump._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {pump.name}
                        {pump.registrationNumber && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            Reg: {pump.registrationNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>
                        {pump.city || '—'}, {pump.province || ''}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          {pump.ownerAdminId?.name || '—'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {pump.ownerAdminId?.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        {pump.businessPhone || pump.ownerAdminId?.phone || '—'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                        {new Date(pump.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Button
                            onClick={() => handleApprove(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="primary"
                            size="sm"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="danger"
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingPumps.map((pump) => (
                <div
                  key={pump._id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
                        ⛽ {pump.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        📍 {pump.city || '—'}, {pump.province || ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--color-warning-soft, #FFF6E5)',
                        color: 'var(--color-warning, #C47B12)',
                        border: '1px solid rgba(196, 123, 18, 0.2)',
                      }}
                    >
                      Pending
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Owner: </span>
                      <strong>{pump.ownerAdminId?.name || '—'}</strong> ({pump.ownerAdminId?.email})
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Phone: </span>
                      <span>{pump.businessPhone || pump.ownerAdminId?.phone || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Submitted: </span>
                      <span>{new Date(pump.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                    <Button
                      onClick={() => handleApprove(pump._id)}
                      loading={actionLoading === pump._id}
                      variant="primary"
                      style={{ flex: 1, minHeight: 40 }}
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(pump._id)}
                      loading={actionLoading === pump._id}
                      variant="danger"
                      style={{ flex: 1, minHeight: 40 }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent Platform Audit Activity */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px',
          padding: 'clamp(16px, 3vw, 22px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
              Recent Platform Activity
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              System audit events across tenants
            </p>
          </div>
          <Link
            to="/super-admin/audit-logs"
            style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Full audit log →
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No recent activity recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.map((log) => (
              <div
                key={log._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--color-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{log.action}</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                    by {log.actorEmail || 'System'}
                  </span>
                  {log.petrolPumpId?.name && (
                    <span
                      style={{
                        marginLeft: '8px',
                        background: 'rgba(79, 70, 229, 0.1)',
                        color: 'var(--color-primary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {log.petrolPumpId.name}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
