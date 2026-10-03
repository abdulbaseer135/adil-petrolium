import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Fuel,
  CreditCard,
  Plus,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  getMyPumpAccounts,
  getPublicPetrolPumps,
  getAvailablePumps,
  submitLinkRequest,
  getMyLinkRequests,
  cancelLinkRequest,
} from '../../api/customerPumpApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/layout/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import { formatMoneyPK } from '../../utils/pkFormat';

export default function CustomerDashboard() {
  const { user } = useSelector((s) => s.auth);
  const [accounts, setAccounts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availablePumps, setAvailablePumps] = useState([]);
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [requestType, setRequestType] = useState('existing_account'); // 'existing_account' | 'new_relationship'
  const [customerCode, setCustomerCode] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [linkSuccess, setLinkSuccess] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accRes, reqRes] = await Promise.allSettled([
        getMyPumpAccounts(),
        getMyLinkRequests(),
      ]);

      if (accRes.status === 'fulfilled') {
        setAccounts(accRes.value?.data?.data || []);
      }
      if (reqRes.status === 'fulfilled') {
        setRequests(reqRes.value?.data?.data || []);
      }
      if (accRes.status === 'rejected' && reqRes.status === 'rejected') {
        setError('Failed to load petrol pump data. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load your petrol pump accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openLinkModal = async (preselectedPumpId = '') => {
    setShowLinkModal(true);
    setLinkError(null);
    setLinkSuccess('');
    setCustomerCode('');
    setNotes('');
    setRequestType('existing_account');

    try {
      let pumps = [];
      try {
        const pubRes = await getPublicPetrolPumps();
        pumps = pubRes.data?.data || [];
      } catch {
        const availRes = await getAvailablePumps();
        pumps = availRes.data?.data || [];
      }

      setAvailablePumps(pumps);
      if (preselectedPumpId) {
        setSelectedPumpId(preselectedPumpId);
      } else if (pumps.length > 0) {
        setSelectedPumpId(pumps[0]._id);
      }
    } catch {
      // Graceful fallback
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedPumpId) {
      setLinkError('Please select a petrol pump station.');
      return;
    }

    if (requestType === 'existing_account' && !customerCode.trim()) {
      setLinkError('Please enter your Customer Code assigned by the petrol pump.');
      return;
    }

    setSubmitting(true);
    setLinkError(null);
    setLinkSuccess('');

    try {
      const payload = {
        petrolPumpId: selectedPumpId,
        requestType,
        requestedCustomerCode: requestType === 'existing_account' ? customerCode.trim().toUpperCase() : undefined,
        requestedPhone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await submitLinkRequest(payload);
      setLinkSuccess(res.data?.message || 'Connection request submitted to the station manager for review.');

      await fetchDashboardData();

      setTimeout(() => {
        setShowLinkModal(false);
        setLinkSuccess('');
      }, 1500);
    } catch (err) {
      setLinkError(
        err?.response?.data?.message ||
          'Failed to submit link request. Please check the information and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this connection request?')) return;
    try {
      setCancellingId(requestId);
      await cancelLinkRequest(requestId);
      await fetchDashboardData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to cancel link request');
    } finally {
      setCancellingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const rejectedRequests = requests.filter((r) => r.status === 'rejected');

  // Compute aggregate total outstanding across accounts
  const totalOutstanding = accounts.reduce(
    (sum, acc) => sum + (Number(acc.currentBalance) || 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ─── Page Header ─── */}
      <PageHeader
        title={`Welcome, ${user?.name || 'Customer'}`}
        subtitle="Manage fuel ledger balances, inspect statements, and track connected petrol pumps."
        actions={
          <Button
            onClick={() => openLinkModal()}
            variant="primary"
            iconLeft={<Plus size={16} />}
          >
            Connect Another Petrol Pump
          </Button>
        }
      />

      {/* Global Error Banner */}
      {error && (
        <ErrorState message={error} onRetry={fetchDashboardData} />
      )}

      {/* ─── Account Summary KPIs ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          icon={<CreditCard size={18} strokeWidth={2.2} />}
          label="Total Balance"
          value={formatMoneyPK(totalOutstanding)}
          subtext={
            totalOutstanding > 0
              ? 'Payable across connected stations'
              : totalOutstanding < 0
              ? 'Advance credit balance'
              : 'All accounts settled'
          }
          variant={totalOutstanding > 0 ? 'danger' : 'success'}
        />

        <StatCard
          icon={<Fuel size={18} strokeWidth={2.2} />}
          label="Connected Stations"
          value={accounts.length}
          subtext="Active station ledgers"
          variant="primary"
        />

        <StatCard
          icon={<Clock size={18} strokeWidth={2.2} />}
          label="Pending Requests"
          value={pendingRequests.length}
          subtext="Awaiting station approval"
          variant="warning"
        />
      </div>

      {/* ─── Pending Connection Requests Notice ─── */}
      {pendingRequests.length > 0 && (
        <Card
          title={`Pending Connection Requests (${pendingRequests.length})`}
          subtitle="Waiting for station manager review and verification"
          icon={<Clock size={16} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                style={{
                  background: 'var(--bg-surface-secondary, #F9FAFB)',
                  border: '1px solid var(--border-default, #E2E8EC)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #17242D)' }}>
                      {req.petrolPumpId?.name || 'Petrol Pump'}
                    </div>
                    <Badge status="pending">Pending</Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #5B6870)', marginTop: '4px' }}>
                    {req.petrolPumpId?.city ? `${req.petrolPumpId.city} • ` : ''}
                    {req.requestType === 'existing_account'
                      ? `Claiming Code: ${req.requestedCustomerCode || '—'}`
                      : 'New Customer Relationship'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #7A878E)', marginTop: '4px' }}>
                    Requested: {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-divider, #E8ECEF)' }}>
                  <Button
                    onClick={() => handleCancelRequest(req._id)}
                    disabled={cancellingId === req._id}
                    variant="ghost"
                    size="sm"
                    style={{ color: 'var(--color-danger, #C64040)' }}
                  >
                    {cancellingId === req._id ? 'Cancelling...' : 'Cancel Request'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Rejected Requests Notice ─── */}
      {rejectedRequests.length > 0 && (
        <Card
          title={`Rejected Connection Requests (${rejectedRequests.length})`}
          icon={<AlertTriangle size={16} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rejectedRequests.map((req) => (
              <div
                key={req._id}
                style={{
                  background: 'var(--bg-surface-secondary, #F9FAFB)',
                  border: '1px solid var(--border-default, #E2E8EC)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #17242D)' }}>
                    {req.petrolPumpId?.name || 'Petrol Pump'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-danger, #C64040)', marginTop: '2px' }}>
                    Reason: {req.rejectionReason || 'Verification could not be confirmed by the station manager.'}
                  </div>
                </div>

                <Button
                  onClick={() => openLinkModal(req.petrolPumpId?._id)}
                  variant="secondary"
                  size="sm"
                >
                  Request Again
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Connected Petrol Pump Accounts ─── */}
      <Card
        title="Connected Petrol Pumps"
        subtitle="Active customer fuel accounts and balances"
        icon={<Fuel size={16} />}
        action={
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #7A878E)' }}>
            {accounts.length} Station{accounts.length === 1 ? '' : 's'}
          </span>
        }
      >
        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted, #7A878E)' }}>
            Loading your petrol pump accounts...
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={<Fuel size={36} />}
            title="No Petrol Pumps Connected Yet"
            description="Connect your customer account to a petrol pump station to inspect purchases, track balances, and download monthly statements."
            action={() => openLinkModal()}
            actionLabel="Connect a Petrol Pump"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {accounts.map((acc) => {
              const pump = acc.petrolPumpId;
              const isOwing = acc.currentBalance > 0;
              const isCredit = acc.currentBalance < 0;

              return (
                <div
                  key={acc._id}
                  style={{
                    background: 'var(--bg-surface, #FFFFFF)',
                    border: '1px solid var(--border-default, #E2E8EC)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div>
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--text-primary, #17242D)',
                          }}
                        >
                          {pump?.name || 'Petrol Pump'}
                        </div>
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--text-muted, #7A878E)',
                            marginTop: '2px',
                          }}
                        >
                          {pump?.city ? `${pump.city}, ${pump.province || ''}` : 'Active Station'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <Badge status="approved">Active</Badge>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--color-primary-soft, #EAF5F1)',
                            color: 'var(--color-primary, #0B5D4B)',
                            border: '1px solid rgba(11, 93, 75, 0.2)',
                          }}
                        >
                          Code: {acc.customerCode}
                        </span>
                      </div>
                    </div>

                    {/* Balance */}
                    <div
                      style={{
                        background: 'var(--bg-surface-secondary, #F9FAFB)',
                        border: '1px solid var(--border-default, #E2E8EC)',
                        borderRadius: 'var(--radius-md, 8px)',
                        padding: '14px',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-secondary, #5B6870)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Outstanding Balance
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 700,
                          marginTop: '4px',
                          fontVariantNumeric: 'tabular-nums',
                          color: isOwing
                            ? 'var(--color-danger, #C64040)'
                            : isCredit
                            ? 'var(--color-success, #18864B)'
                            : 'var(--text-primary, #17242D)',
                        }}
                      >
                        {formatMoneyPK(acc.currentBalance)}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          marginTop: '4px',
                          color: 'var(--text-muted, #7A878E)',
                        }}
                      >
                        {isOwing
                          ? 'Payable to Station'
                          : isCredit
                          ? 'Advance Credit in your favor'
                          : 'Zero Balance / Settled'}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-secondary, #5B6870)',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <span>Credit Limit: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {acc.creditLimit > 0 ? formatMoneyPK(acc.creditLimit) : 'No Limit'}
                        </strong>
                      </div>
                      <div>
                        <span>Contact: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {pump?.businessPhone || '—'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/dashboard/pumps/${acc._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: 'var(--color-primary, #0B5D4B)',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Account & Statement</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Connect Station Modal ─── */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Connect Petrol Pump Station"
        maxWidth={500}
      >
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Link your account to an existing station customer record or request a new customer ledger relationship.
        </p>

        {linkError && (
          <div
            role="alert"
            style={{
              background: 'var(--color-danger-bg, #FDEEEE)',
              border: '1px solid var(--color-danger-border, #F7CACA)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--color-danger, #C64040)',
              marginBottom: '16px',
            }}
          >
            {linkError}
          </div>
        )}

        {linkSuccess && (
          <div
            role="alert"
            style={{
              background: 'var(--color-success-bg, #EAF7EF)',
              border: '1px solid var(--color-success-border, #C8EBD5)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'var(--color-success, #18864B)',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            ✓ {linkSuccess}
          </div>
        )}

        <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Petrol Pump
            </label>
            <select
              value={selectedPumpId}
              onChange={(e) => setSelectedPumpId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--border-default, #E2E8EC)',
                background: 'var(--bg-surface, #FFFFFF)',
                color: 'var(--text-primary, #17242D)',
                fontSize: '13.5px',
              }}
              required
            >
              {availablePumps.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.city ? `(${p.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Relationship Type
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reqType"
                  value="existing_account"
                  checked={requestType === 'existing_account'}
                  onChange={() => setRequestType('existing_account')}
                />
                <span>I already have an account code at this station</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="reqType"
                  value="new_relationship"
                  checked={requestType === 'new_relationship'}
                  onChange={() => setRequestType('new_relationship')}
                />
                <span>I am requesting a new customer relationship</span>
              </label>
            </div>
          </div>

          {requestType === 'existing_account' && (
            <Input
              label="Assigned Customer Code"
              placeholder="e.g. CUST-1042"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              required
            />
          )}

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
          />

          <Input
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle details or account info"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowLinkModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
            >
              Submit Connection Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}