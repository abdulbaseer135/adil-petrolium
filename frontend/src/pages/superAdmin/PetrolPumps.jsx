import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getPetrolPumps,
  approvePetrolPump,
  rejectPetrolPump,
  suspendPetrolPump,
  reactivatePetrolPump,
} from '../../api/superAdminApi';
import { Button } from '../../components/ui/Button';

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

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'var(--color-warning-soft, #FFF6E5)', color: 'var(--color-warning, #C47B12)', label: 'Pending Approval' },
      approved: { bg: 'var(--color-success-soft, #EAF7EF)', color: 'var(--color-success, #18864B)', label: 'Approved / Active' },
      active: { bg: 'var(--color-success-soft, #EAF7EF)', color: 'var(--color-success, #18864B)', label: 'Active' },
      suspended: { bg: 'var(--color-danger-soft, #FDEEEE)', color: 'var(--color-danger, #C64040)', label: 'Suspended' },
      rejected: { bg: 'var(--color-surface-secondary, #F9FAFB)', color: 'var(--color-text-muted, #7A878E)', label: 'Rejected' },
    };
    const s = styles[status] || { bg: 'var(--color-surface-secondary, #F9FAFB)', color: 'var(--color-text-muted)', label: status };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '3px 8px',
          borderRadius: '999px',
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.color}33`,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
            Petrol Pump Management
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Review, approve, suspend, and supervise all petrol pump stations in the system
          </p>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--color-surface)',
          padding: 'clamp(10px, 2.5vw, 16px)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            maxWidth: '100%',
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {[
            { id: '', label: 'All Stations' },
            { id: 'pending', label: 'Pending Approvals' },
            { id: 'approved', label: 'Active & Approved' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleStatusFilterChange(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedStatus === tab.id ? 'var(--color-primary)' : 'transparent',
                background: selectedStatus === tab.id ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                color: selectedStatus === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: selectedStatus === tab.id ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
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
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              fontSize: '13px',
              flex: '1 1 180px',
              minWidth: 0,
            }}
          />
          <Button type="submit" style={{ minHeight: 38, padding: '6px 16px', fontSize: '13px' }}>
            Search
          </Button>
        </form>
      </div>

      {/* Main Table */}
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
            Loading stations...
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-error)', textAlign: 'center' }}>
            {error}
          </div>
        ) : pumps.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No petrol pumps found matching the criteria.
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
                    fontSize: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Station</th>
                  <th style={{ padding: '12px 14px' }}>Location</th>
                  <th style={{ padding: '12px 14px' }}>Administrator</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Registered</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pumps.map((pump) => (
                  <tr
                    key={pump._id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⛽</span>
                        <span>{pump.name}</span>
                      </div>
                      {pump.registrationNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '24px' }}>
                          Reg: {pump.registrationNumber}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)' }}>
                      <div>{pump.city || '—'}</div>
                      <div style={{ fontSize: '12px' }}>{pump.province || ''}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                        {pump.ownerAdminId?.name || '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {pump.ownerAdminId?.email}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>{getStatusBadge(pump.status)}</td>
                    <td style={{ padding: '14px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {new Date(pump.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <Button
                          onClick={() => setSelectedPump(pump)}
                          variant="ghost"
                          style={{ padding: '4px 8px', fontSize: '12px', minHeight: 30 }}
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
                          </>
                        )}

                        {['approved', 'active'].includes(pump.status) && (
                          <Button
                            onClick={() => handleSuspend(pump._id)}
                            loading={actionLoading === pump._id}
                            variant="danger"
                            size="sm"
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
      </div>

      {/* Details Modal */}
      {selectedPump && (
        <div
          onClick={() => setSelectedPump(null)}
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-container"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                Station Details: {selectedPump.name}
              </h3>
              <button
                onClick={() => setSelectedPump(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}
                aria-label="Close station details"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>Status:</strong> {getStatusBadge(selectedPump.status)}
              </div>
              {selectedPump.rejectionReason && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '8px', color: '#dc2626' }}>
                  <strong>Rejection Reason:</strong> {selectedPump.rejectionReason}
                </div>
              )}
              {selectedPump.suspensionReason && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '8px', color: '#dc2626' }}>
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

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button onClick={() => setSelectedPump(null)} variant="secondary" style={{ minHeight: 40 }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
