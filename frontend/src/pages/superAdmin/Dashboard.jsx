import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Fuel,
  Clock,
  CheckCircle,
  AlertOctagon,
  UserCheck,
  Users,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import {
  getSuperAdminDashboard,
  approvePetrolPump,
  rejectPetrolPump,
} from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/dashboard/StatCard';

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

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
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
      {/* ─── Page Header ─── */}
      <PageHeader
        title="Platform Dashboard"
        subtitle="Multi-tenant SaaS oversight, station approvals, and system-wide operational metrics."
        actions={
          <Button
            onClick={fetchDashboard}
            variant="outline"
            size="sm"
          >
            Refresh Metrics
          </Button>
        }
      />

      {/* ─── KPI Metrics Grid (6 Cards) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard
          icon={<Fuel size={18} strokeWidth={2.2} />}
          label="Total Stations"
          value={totalStations}
          subtext="Registered petrol pumps"
          variant="primary"
        />

        <StatCard
          icon={<Clock size={18} strokeWidth={2.2} />}
          label="Pending Approvals"
          value={pendingApprovalsCount}
          subtext="Requiring review"
          variant="warning"
        />

        <StatCard
          icon={<CheckCircle size={18} strokeWidth={2.2} />}
          label="Active Stations"
          value={activeStations}
          subtext="Operating online"
          variant="success"
        />

        <StatCard
          icon={<AlertOctagon size={18} strokeWidth={2.2} />}
          label="Suspended"
          value={suspendedStations}
          subtext="Halted operations"
          variant="danger"
        />

        <StatCard
          icon={<UserCheck size={18} strokeWidth={2.2} />}
          label="Station Admins"
          value={totalAdminsCount}
          subtext="Station owners / admins"
          variant="secondary"
        />

        <StatCard
          icon={<Users size={18} strokeWidth={2.2} />}
          label="Global Customers"
          value={totalCustomersCount}
          subtext="Registered customer accounts"
          variant="secondary"
        />
      </div>

      {/* ─── Main Content Grid: Approvals & Audit Activity ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Pending Station Registrations */}
        <Card
          title={`Pending Registrations (${pendingPumps.length})`}
          subtitle="New station applications awaiting review"
          icon={<Clock size={16} />}
          action={
            <Link
              to="/super-admin/petrol-pumps?status=pending"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-primary, #0B5D4B)',
                textDecoration: 'none',
              }}
            >
              View All Pumps →
            </Link>
          }
        >
          {pendingPumps.length === 0 ? (
            <EmptyState
              icon={<CheckCircle size={34} />}
              title="All caught up!"
              description="No pending station registration applications at this time."
            />
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default, #E2E8EC)', textAlign: 'left', color: 'var(--text-secondary, #5B6870)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Station</th>
                    <th style={{ padding: '8px 10px' }}>City</th>
                    <th style={{ padding: '8px 10px' }}>Owner</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPumps.map((pump) => (
                    <tr key={pump._id} style={{ borderBottom: '1px solid var(--border-divider, #E8ECEF)' }}>
                      <td style={{ padding: '10px', fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                        <div>{pump.name}</div>
                        {pump.registrationNumber && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted, #7A878E)', fontWeight: 400 }}>
                            Reg: {pump.registrationNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary, #5B6870)' }}>
                        {pump.city || '—'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #17242D)' }}>
                          {pump.ownerAdminId?.name || '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #7A878E)' }}>
                          {pump.ownerAdminId?.email}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            onClick={() => handleApprove(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="primary"
                            size="sm"
                            iconLeft={<Check size={13} />}
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="danger"
                            size="sm"
                            iconLeft={<X size={13} />}
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
          )}
        </Card>

        {/* Recent Platform Activity */}
        <Card
          title="Recent Platform Activity"
          subtitle="Audit log events across tenants"
          icon={<ShieldCheck size={16} />}
          action={
            <Link
              to="/super-admin/audit-logs"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-primary, #0B5D4B)',
                textDecoration: 'none',
              }}
            >
              Full Audit Log →
            </Link>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={34} />}
              title="No recent activity"
              description="Platform audit events will appear here."
            />
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
                    background: 'var(--bg-surface-secondary, #F9FAFB)',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-default, #E2E8EC)',
                    fontSize: '13px',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-muted, #7A878E)', fontSize: '12px' }}>
                      by {log.actorEmail || 'System'}
                    </span>
                    {log.petrolPumpId?.name && (
                      <span
                        style={{
                          background: 'var(--color-primary-soft, #EAF5F1)',
                          color: 'var(--color-primary, #0B5D4B)',
                          border: '1px solid rgba(11, 93, 75, 0.2)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {log.petrolPumpId.name}
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted, #7A878E)', fontSize: '11px' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
