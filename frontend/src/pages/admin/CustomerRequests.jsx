import React, { useEffect, useState, useCallback } from 'react';
import {
  Link2,
  UserCheck,
  Check,
  X,
  UserPlus,
} from 'lucide-react';
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
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import { formatDatePK as formatDate } from '../../utils/pkFormat';

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

      toast.success({ title: 'Created & Linked', message: 'New customer account created and linked.' });
      setApproveModal({ open: false, request: null });
      loadRequests();
    } catch (err) {
      toast.error({
        title: 'Approval Failed',
        message: err?.response?.data?.message || 'Failed to create customer account',
      });
    } finally {
      setActionLoading(null);
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Customer Connection Requests"
        subtitle="Review requests from customers connecting their online logins to your petrol pump accounts."
      />

      {/* Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'pending', label: 'Pending Requests', count: pendingCount },
            { id: 'approved', label: 'Approved History' },
            { id: 'rejected', label: 'Rejected' },
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--color-primary)' : 'transparent',
                  background: isActive ? 'var(--color-primary-soft, #EAF5F1)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 650 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease',
                }}
              >
                <span>{item.label}</span>
                {item.count != null && item.count > 0 && (
                  <span
                    style={{
                      background: 'var(--color-accent, #D89B2B)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading requests...
          </div>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 size={36} />}
            title={`No ${tab} connection requests`}
            description={
              tab === 'pending'
                ? 'When customers select your station during signup or in their portal, their requests will appear here for review.'
                : `No ${tab} requests on record.`
            }
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {requests.map((r) => {
            const isPending = r.status === 'pending';
            const isApproved = r.status === 'approved';
            const isExisting = r.requestType === 'existing_account';

            return (
              <Card key={r._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md, 8px)',
                        background: isExisting ? 'var(--color-primary-soft, #EAF5F1)' : 'var(--color-success-bg, #EAF7EF)',
                        color: isExisting ? 'var(--color-primary, #0B5D4B)' : 'var(--color-success, #18864B)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isExisting ? <Link2 size={20} /> : <UserPlus size={20} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                          {r.customerUserId?.name || 'Online Customer'}
                        </span>
                        <Badge variant={isExisting ? 'primary' : 'success'}>
                          {isExisting ? 'Existing Account Link' : 'New Customer Request'}
                        </Badge>
                        <Badge status={r.status}>{r.status}</Badge>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                        Email: {r.customerUserId?.email || '—'} • Phone: {r.requestedPhone || r.customerUserId?.phone || '—'}
                      </div>
                    </div>
                  </div>

                  {isPending && (
                    <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
                      {isExisting ? (
                        <Button
                          onClick={() => handleApproveExisting(r._id)}
                          loading={actionLoading === r._id}
                          variant="primary"
                          size="sm"
                          iconLeft={<Check size={14} />}
                        >
                          Approve Link
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openNewRelationshipModal(r)}
                          loading={actionLoading === r._id}
                          variant="primary"
                          size="sm"
                          iconLeft={<UserCheck size={14} />}
                        >
                          Create Account & Approve
                        </Button>
                      )}

                      <Button
                        onClick={() => openRejectModal(r._id)}
                        loading={actionLoading === r._id}
                        variant="danger"
                        size="sm"
                        iconLeft={<X size={14} />}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'var(--bg-surface-secondary, #F9FAFB)',
                    borderRadius: 'var(--radius-md, 8px)',
                    marginTop: '14px',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Requested Customer Code
                    </span>
                    <span style={{ fontWeight: 650, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {r.requestedCustomerCode || '— (Requesting New Code)'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                      Submitted On
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(r.createdAt)}</span>
                  </div>

                  {r.notes && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                        Customer Notes
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{r.notes}</span>
                    </div>
                  )}

                  {r.rejectionReason && (
                    <div>
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                        Rejection Reason
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{r.rejectionReason}</span>
                    </div>
                  )}

                  {isApproved && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                        Reviewed At
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{formatDate(r.reviewedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create & Approve New Relationship */}
      <Modal
        isOpen={approveModal.open}
        onClose={() => setApproveModal({ open: false, request: null })}
        title="Create & Approve Customer Account"
        maxWidth={480}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveModal({ open: false, request: null })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={actionLoading === approveModal.request?._id}
              variant="primary"
            >
              Confirm & Link Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rejection Reason */}
      <Modal
        isOpen={rejectModal.open}
        onClose={() => setRejectModal({ open: false, requestId: null, reason: '' })}
        title="Reject Connection Request"
        maxWidth={440}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Optionally provide a reason so the customer understands why the request was declined.
        </p>

        <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Rejection Reason (Optional)"
            placeholder="e.g. Customer code not found, phone number does not match record"
            value={rejectModal.reason}
            onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModal({ open: false, requestId: null, reason: '' })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={actionLoading === rejectModal.requestId}
              variant="danger"
            >
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
