import React, { useEffect, useState, useCallback } from 'react';
import {
  getAdminLinkRequests,
  approveAdminLinkRequest,
  rejectAdminLinkRequest,
} from '../../api/customerPumpApi';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import { formatMoneyPK as formatPKR, formatDatePK as formatDate } from '../../utils/pkFormat';

export default function CustomerRequests() {
  const toast = useToast();
  const [tab, setTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // New relationship approval modal state
  const [approveModal, setApproveModal] = useState({
    open: false,
    request: null,
    customerCode: '',
    customerName: '',
    creditLimit: '0',
    openingBalance: '0',
    address: '',
    vehicleInfo: '',
  });

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    reason: '',
  });

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminLinkRequests({ status: tab });
      const data = res.data?.data || {};
      setRequests(data.requests || []);
      setPendingCount(data.pendingCount || 0);
    } catch {
      toast.error({ title: 'Error', message: 'Failed to load customer link requests' });
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handle direct approval for existing_account
  const handleApproveExisting = async (reqId) => {
    setActionLoading(reqId);
    try {
      await approveAdminLinkRequest(reqId, {});
      toast.success({ title: 'Approved', message: 'Customer account successfully linked.' });
      loadRequests();
    } catch (err) {
      toast.error({
        title: 'Approval Failed',
        message: err?.response?.data?.message || 'Failed to approve request',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Open modal for new relationship approval
  const openNewRelationshipModal = (req) => {
    setApproveModal({
      open: true,
      request: req,
      customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: req.customerUserId?.name || '',
      creditLimit: '0',
      openingBalance: '0',
      address: '',
      vehicleInfo: '',
    });
  };

  const handleConfirmNewRelationship = async (e) => {
    e.preventDefault();
    if (!approveModal.request) return;

    setActionLoading(approveModal.request._id);
    try {
      await approveAdminLinkRequest(approveModal.request._id, {
        customerCode: approveModal.customerCode,
        customerName: approveModal.customerName,
        creditLimit: Number(approveModal.creditLimit) || 0,
        openingBalance: Number(approveModal.openingBalance) || 0,
        address: approveModal.address,
        vehicleInfo: approveModal.vehicleInfo,
      });

      toast.success({
        title: 'Account Created & Linked',
        message: `Customer account ${approveModal.customerCode} created and approved.`,
      });
      setApproveModal({ open: false, request: null });
      loadRequests();
    } catch (err) {
      toast.error({
        title: 'Approval Failed',
        message: err?.response?.data?.message || 'Failed to create and approve account',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Open rejection modal
  const openRejectModal = (reqId) => {
    setRejectModal({ open: true, requestId: reqId, reason: '' });
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModal.requestId) return;

    setActionLoading(rejectModal.requestId);
    try {
      await rejectAdminLinkRequest(rejectModal.requestId, {
        rejectionReason: rejectModal.reason,
      });
      toast.info({ title: 'Rejected', message: 'Customer request rejected.' });
      setRejectModal({ open: false, requestId: null, reason: '' });
      loadRequests();
    } catch (err) {
      toast.error({
        title: 'Action Failed',
        message: err?.response?.data?.message || 'Failed to reject request',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--color-text)' }}>
          Customer Connection Requests
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Review requests from customers connecting their online logins to your petrol pump accounts.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setTab('pending')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'pending' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'pending' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: tab === 'pending' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Pending Requests
          {pendingCount > 0 && (
            <span
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '10px',
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('approved')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'approved' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'approved' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: tab === 'approved' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Approved History
        </button>

        <button
          onClick={() => setTab('rejected')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'rejected' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'rejected' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: tab === 'rejected' ? 600 : 500,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Rejected
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="🔗"
          title={`No ${tab} connection requests`}
          description={
            tab === 'pending'
              ? 'When customers select your station during signup or in their portal, their requests will appear here for review.'
              : `No ${tab} requests on record.`
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {requests.map((r) => {
            const isPending = r.status === 'pending';
            const isApproved = r.status === 'approved';
            const isExisting = r.requestType === 'existing_account';

            return (
              <div
                key={r._id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: isExisting ? 'var(--color-primary-soft, #EAF5F1)' : 'var(--color-success-soft, #EAF7EF)',
                        color: isExisting ? 'var(--color-primary, #0B5D4B)' : 'var(--color-success, #18864B)',
                        border: `1px solid ${isExisting ? 'rgba(11, 93, 75, 0.2)' : 'rgba(24, 134, 75, 0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {isExisting ? '🏷️' : '✨'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>
                          {r.customerUserId?.name || 'Online Customer'}
                        </span>
                        <Badge variant={isExisting ? 'primary' : 'success'}>
                          {isExisting ? 'Existing Account Link' : 'New Customer Request'}
                        </Badge>
                        <Badge
                          variant={
                            r.status === 'approved'
                              ? 'success'
                              : r.status === 'rejected'
                              ? 'danger'
                              : r.status === 'cancelled'
                              ? 'secondary'
                              : 'warning'
                          }
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Requested: {formatDate(r.requestedAt || r.createdAt)} • Phone: {r.customerUserId?.phone || r.requestedPhone || 'N/A'} • Email: {r.customerUserId?.email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Pending */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isExisting ? (
                        <Button
                          onClick={() => handleApproveExisting(r._id)}
                          loading={actionLoading === r._id}
                          variant="primary"
                          size="sm"
                        >
                          Approve Link
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openNewRelationshipModal(r)}
                          loading={actionLoading === r._id}
                          variant="primary"
                          size="sm"
                        >
                          Create & Approve
                        </Button>
                      )}
                      <Button
                        onClick={() => openRejectModal(r._id)}
                        variant="danger"
                        size="sm"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div
                  style={{
                    background: 'var(--color-surface-secondary, #F9FAFB)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    fontSize: '13px',
                  }}
                >
                  {isExisting ? (
                    <>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                          Requested Code
                        </span>
                        <strong style={{ color: 'var(--color-text)' }}>{r.requestedCustomerCode || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                          Matched Station Account
                        </span>
                        <span style={{ color: 'var(--color-text)' }}>
                          {r.customerPumpAccountId?.customerName || 'Account on file'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                          Current Ledger Balance
                        </span>
                        <strong style={{ color: 'var(--color-text)' }}>
                          {formatPKR(r.customerPumpAccountId?.currentBalance || 0)}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                        Customer Request Note
                      </span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {r.notes || 'Customer requested a new credit/fuel relationship with this petrol station.'}
                      </span>
                    </div>
                  )}

                  {r.status === 'rejected' && r.rejectionReason && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600, display: 'block', fontSize: '12px' }}>
                        Rejection Reason:
                      </span>
                      <span style={{ color: 'var(--color-text)' }}>{r.rejectionReason}</span>
                    </div>
                  )}

                  {isApproved && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                        Reviewed At
                      </span>
                      <span style={{ color: 'var(--color-text)' }}>{formatDate(r.reviewedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create & Approve New Relationship */}
      {approveModal.open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setApproveModal({ open: false, request: null })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-container"
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
              Create & Approve Customer Account
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              Assign a station customer code and credit terms for{' '}
              <strong>{approveModal.request?.customerUserId?.name}</strong>.
            </p>

            <form onSubmit={handleConfirmNewRelationship} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Customer Code"
                value={approveModal.customerCode}
                onChange={(e) => setApproveModal((prev) => ({ ...prev, customerCode: e.target.value }))}
                required
                hint="Unique station code for this customer"
              />

              <Input
                label="Business / Account Name"
                value={approveModal.customerName}
                onChange={(e) => setApproveModal((prev) => ({ ...prev, customerName: e.target.value }))}
                required
              />

              <div className="responsive-form-row">
                <Input
                  label="Credit Limit (PKR)"
                  type="number"
                  value={approveModal.creditLimit}
                  onChange={(e) => setApproveModal((prev) => ({ ...prev, creditLimit: e.target.value }))}
                />
                <Input
                  label="Opening Balance (PKR)"
                  type="number"
                  value={approveModal.openingBalance}
                  onChange={(e) => setApproveModal((prev) => ({ ...prev, openingBalance: e.target.value }))}
                />
              </div>

              <Input
                label="Address / Notes"
                value={approveModal.address}
                onChange={(e) => setApproveModal((prev) => ({ ...prev, address: e.target.value }))}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setApproveModal({ open: false, request: null })}
                  style={{ minHeight: 40 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={actionLoading === approveModal.request?._id}
                  variant="primary"
                  style={{ minHeight: 40 }}
                >
                  Confirm & Link Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {rejectModal.open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setRejectModal({ open: false, requestId: null, reason: '' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-container"
            style={{ maxWidth: 440 }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
              Reject Connection Request
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
              Optionally provide a reason so the customer understands why the request was declined.
            </p>

            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Rejection Reason (Optional)"
                placeholder="e.g. Customer code not found, phone number does not match record"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRejectModal({ open: false, requestId: null, reason: '' })}
                  style={{ minHeight: 40 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={actionLoading === rejectModal.requestId}
                  variant="danger"
                  style={{ minHeight: 40 }}
                >
                  Reject Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
