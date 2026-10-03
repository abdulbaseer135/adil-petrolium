import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Fuel, Check, X, ShieldAlert, RotateCcw } from 'lucide-react';
import {
  getPetrolPumps,
  approvePetrolPump,
  rejectPetrolPump,
  suspendPetrolPump,
  reactivatePetrolPump,
} from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';

export default function PetrolPumps() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPump, setSelectedPump] = useState(null);

  const fetchPumps = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;
      const res = await getPetrolPumps(params);
      setPumps(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch petrol pumps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPumps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const handleStatusFilterChange = (status) => {
    setSelectedStatus(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await approvePetrolPump(id);
      await fetchPumps();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;
    try {
      setActionLoading(id);
      await rejectPetrolPump(id, reason);
      await fetchPumps();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reject petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id) => {
    const reason = prompt('Please enter reason for suspension:');
    if (!reason) return;
    try {
      setActionLoading(id);
      await suspendPetrolPump(id, reason);
      await fetchPumps();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to suspend petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (id) => {
    try {
      setActionLoading(id);
      await reactivatePetrolPump(id);
      await fetchPumps();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reactivate petrol pump');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title */}
      <PageHeader
        title="Petrol Pump Management"
        subtitle="Review, approve, suspend, and supervise all petrol pump stations in the system."
      />

      {/* Filter Tabs and Search Bar */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              maxWidth: '100%',
              paddingBottom: '2px',
            }}
          >
            {[
              { id: '', label: 'All Stations' },
              { id: 'pending', label: 'Pending Approvals' },
              { id: 'approved', label: 'Active & Approved' },
              { id: 'suspended', label: 'Suspended' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilterChange(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                    background: isActive ? 'var(--color-primary-soft, #EAF5F1)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 650 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 150ms ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchPumps();
            }}
            style={{
              display: 'flex',
              gap: '8px',
              width: '100%',
              maxWidth: 360,
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Search name, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default, #E2E8EC)',
                background: 'var(--bg-surface-secondary, #F9FAFB)',
                color: 'var(--text-primary, #17242D)',
                fontSize: '13px',
                flex: '1 1 180px',
                minWidth: 0,
                outline: 'none',
              }}
            />
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
          </form>
        </div>
      </Card>

      {/* Main Table */}
      <Card>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading stations...
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPumps} />
        ) : pumps.length === 0 ? (
          <EmptyState
            icon={<Fuel size={36} />}
            title="No petrol pumps found"
            description="No stations match the selected filter or search criteria."
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
                  <th style={{ padding: '10px 12px' }}>Station</th>
                  <th style={{ padding: '10px 12px' }}>Location</th>
                  <th style={{ padding: '10px 12px' }}>Administrator</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Registered</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pumps.map((pump) => (
                  <tr
                    key={pump._id}
                    style={{
                      borderBottom: '1px solid var(--border-divider, #E8ECEF)',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 650, color: 'var(--text-primary, #17242D)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Fuel size={16} color="var(--color-primary, #0B5D4B)" />
                        <span>{pump.name}</span>
                      </div>
                      {pump.registrationNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #7A878E)', fontWeight: 400, marginLeft: '24px' }}>
                          Reg: {pump.registrationNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary, #5B6870)' }}>
                      <div>{pump.city || '—'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{pump.province || ''}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #17242D)' }}>
                        {pump.ownerAdminId?.name || '—'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #7A878E)' }}>
                        {pump.ownerAdminId?.email}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge status={pump.status}>{pump.status}</Badge>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted, #7A878E)', fontSize: '12.5px' }}>
                      {new Date(pump.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          onClick={() => setSelectedPump(pump)}
                          variant="ghost"
                          size="sm"
                        >
                          Details
                        </Button>

                        {pump.status === 'pending' && (
                          <>
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
                          </>
                        )}

                        {['approved', 'active'].includes(pump.status) && (
                          <Button
                            onClick={() => handleSuspend(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="danger"
                            size="sm"
                            iconLeft={<ShieldAlert size={13} />}
                          >
                            Suspend
                          </Button>
                        )}

                        {pump.status === 'suspended' && (
                          <Button
                            onClick={() => handleReactivate(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="primary"
                            size="sm"
                            iconLeft={<RotateCcw size={13} />}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      {selectedPump && (
        <Modal
          isOpen={!!selectedPump}
          onClose={() => setSelectedPump(null)}
          title={`Station Details: ${selectedPump.name}`}
          footer={
            <Button onClick={() => setSelectedPump(null)} variant="secondary">
              Close
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>Status:</strong> <Badge status={selectedPump.status}>{selectedPump.status}</Badge>
            </div>
            {selectedPump.rejectionReason && (
              <div style={{ background: 'var(--color-danger-bg, #FDEEEE)', border: '1px solid var(--color-danger-border, #F7CACA)', padding: '10px 12px', borderRadius: '8px', color: 'var(--color-danger, #C64040)' }}>
                <strong>Rejection Reason:</strong> {selectedPump.rejectionReason}
              </div>
            )}
            {selectedPump.suspensionReason && (
              <div style={{ background: 'var(--color-danger-bg, #FDEEEE)', border: '1px solid var(--color-danger-border, #F7CACA)', padding: '10px 12px', borderRadius: '8px', color: 'var(--color-danger, #C64040)' }}>
                <strong>Suspension Reason:</strong> {selectedPump.suspensionReason}
              </div>
            )}
            <div>
              <strong>Registration #:</strong> {selectedPump.registrationNumber || 'None provided'}
            </div>
            <div>
              <strong>Address:</strong> {selectedPump.address || '—'}, {selectedPump.city}, {selectedPump.province}
            </div>
            <div>
              <strong>Business Phone:</strong> {selectedPump.businessPhone || '—'}
            </div>
            <div>
              <strong>Business Email:</strong> {selectedPump.businessEmail || '—'}
            </div>
            <div>
              <strong>Owner Admin:</strong> {selectedPump.ownerAdminId?.name} ({selectedPump.ownerAdminId?.email})
            </div>
            <div>
              <strong>Created At:</strong> {new Date(selectedPump.createdAt).toLocaleString()}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
