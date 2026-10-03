import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
      // Try public list first, fallback to available pumps
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

      // Refresh dashboard data
      await fetchDashboardData();

      setTimeout(() => {
        setShowLinkModal(false);
        setLinkSuccess('');
      }, 2000);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 6px',
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome, {user?.name || 'Valued Customer'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Manage fuel ledger balances, view monthly statements, and inspect transactions across
            all your connected petrol pumps
          </p>
        </div>

        <Button
          onClick={() => openLinkModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: 42,
            fontSize: '14px',
            fontWeight: 600,
            background: 'var(--color-primary)',
          }}
        >
          <span>➕</span>
          <span>Connect Another Petrol Pump</span>
        </Button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          style={{
            background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
            padding: '16px',
            borderRadius: '12px',
            color: 'var(--color-error)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <Button onClick={fetchDashboardData} variant="secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
            Retry
          </Button>
        </div>
      )}

      {/* Pending Connection Requests Notice / Cards */}
      {pendingRequests.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-warning, #C47B12)',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Pending Connection Requests ({pendingRequests.length})
            </h3>
            <span
              style={{
                fontSize: '12px',
                background: 'var(--color-warning-soft, #FFF6E5)',
                color: 'var(--color-warning, #C47B12)',
                padding: '2px 8px',
                borderRadius: '999px',
                fontWeight: 600,
                border: '1px solid rgba(196, 123, 18, 0.25)',
              }}
            >
              Waiting for Admin Approval
            </span>
          </div>

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
                  background: 'var(--color-surface-secondary, #F9FAFB)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>
                      ⛽ {req.petrolPumpId?.name || 'Petrol Pump'}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--color-warning-soft, #FFF6E5)',
                        color: 'var(--color-warning, #C47B12)',
                        border: '1px solid rgba(196, 123, 18, 0.2)',
                      }}
                    >
                      Pending
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {req.petrolPumpId?.city ? `${req.petrolPumpId.city} • ` : ''}
                    {req.requestType === 'existing_account'
                      ? `Claiming Code: ${req.requestedCustomerCode || '—'}`
                      : 'New Customer Relationship'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    Requested: {new Date(req.requestedAt || req.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => handleCancelRequest(req._id)}
                    disabled={cancellingId === req._id}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-error)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '4px 8px',
                    }}
                  >
                    {cancellingId === req._id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Requests Notice */}
      {rejectedRequests.length > 0 && (
        <div
          style={{
            background: 'color-mix(in oklch, var(--color-error) 6%, var(--color-surface))',
            border: '1px solid color-mix(in oklch, var(--color-error) 24%, transparent)',
            borderRadius: '16px',
            padding: '18px 22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Rejected Requests ({rejectedRequests.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rejectedRequests.map((req) => (
              <div
                key={req._id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)' }}>
                    {req.petrolPumpId?.name || 'Petrol Pump'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '2px' }}>
                    Reason: {req.rejectionReason || 'Verification could not be confirmed by the station manager.'}
                  </div>
                </div>

                <Button
                  onClick={() => openLinkModal(req.petrolPumpId?._id)}
                  variant="secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Request Again
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Section: Approved Petrol Pumps */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            My Petrol Pumps
          </h2>
          <span
            style={{
              background: 'rgba(79, 70, 229, 0.1)',
              color: 'var(--color-primary)',
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {accounts.length} Connected
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading your petrol pump accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '2px dashed var(--color-border)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '14px' }}>⛽</div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: '0 0 8px',
                color: 'var(--color-text)',
              }}
            >
              No Petrol Pumps Connected Yet
            </h3>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '14px',
                maxWidth: 460,
                margin: '0 auto 24px',
                lineHeight: 1.5,
              }}
            >
              You have a global customer login. Connect your account to one or more petrol pump stations
              to track purchases, view running balances, and inspect monthly statements.
            </p>
            <Button onClick={() => openLinkModal()} style={{ minHeight: 42, padding: '0 24px' }}>
              Connect a Petrol Pump
            </Button>
          </div>
        ) : (
          <div className="responsive-card-grid">
            {accounts.map((acc) => {
              const pump = acc.petrolPumpId;
              const isOwing = acc.currentBalance > 0;
              const isCredit = acc.currentBalance < 0;

              return (
                <div
                  key={acc._id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '22px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div>
                    {/* Top Row: Station info & status */}
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
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>⛽</span>
                          <span>{pump?.name || 'Petrol Pump'}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--color-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {pump?.city ? `${pump.city}, ${pump.province || ''}` : 'Active Station'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'var(--color-success-soft, #EAF7EF)',
                            color: 'var(--color-success, #18864B)',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(24, 134, 75, 0.2)',
                          }}
                        >
                          ✓ Approved
                        </span>
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

                    {/* Balance display */}
                    <div
                      style={{
                        background: 'var(--color-surface-secondary, #F9FAFB)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        Current Outstanding Balance
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 800,
                          marginTop: '4px',
                          color: isOwing
                            ? 'var(--color-danger, #C64040)'
                            : isCredit
                            ? 'var(--color-success, #18864B)'
                            : 'var(--color-text-primary, #17242D)',
                        }}
                      >
                        {formatMoneyPK(acc.currentBalance)}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isOwing ? 'var(--color-danger, #C64040)' : isCredit ? 'var(--color-success, #18864B)' : 'var(--color-text-muted, #7A878E)',
                          }}
                        />
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {isOwing
                            ? 'Payable to Station'
                            : isCredit
                            ? 'Advance Credit in your favor'
                            : 'Zero Balance / Settled'}
                        </span>
                      </div>
                    </div>

                    {/* Account Metadata */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        marginBottom: '20px',
                      }}
                    >
                      <div>
                        <span>Credit Limit: </span>
                        <strong style={{ color: 'var(--color-text)' }}>
                          {acc.creditLimit > 0 ? formatMoneyPK(acc.creditLimit) : 'No Limit'}
                        </strong>
                      </div>
                      <div>
                        <span>Station Contact: </span>
                        <strong style={{ color: 'var(--color-text)' }}>
                          {pump?.businessPhone || '—'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Open Account Action Button */}
                  <Link
                    to={`/dashboard/pumps/${acc._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px 16px',
                      borderRadius: '10px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    <span>View Account</span>
                    <span>→</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Another Petrol Pump Modal */}
      {showLinkModal && (
        <div
          onClick={() => setShowLinkModal(false)}
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-container"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                Connect Petrol Pump Station
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
                marginTop: 0,
                marginBottom: '18px',
              }}
            >
              Link your login account to an existing station customer record or request a new customer
              ledger relationship. The station manager will review and authorize your request.
            </p>

            {linkError && (
              <div
                role="alert"
                style={{
                  background: 'color-mix(in oklch, var(--color-error) 10%, var(--color-surface))',
                  border: '1px solid color-mix(in oklch, var(--color-error) 24%, transparent)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: 'var(--color-error)',
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
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#059669',
                  marginBottom: '16px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                ✓ {linkSuccess}
              </div>
            )}

            <form
              onSubmit={handleLinkSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Pump Select */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: 'var(--color-text)',
                  }}
                >
                  Select Petrol Pump
                </label>
                <select
                  value={selectedPumpId}
                  onChange={(e) => setSelectedPumpId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
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

              {/* Relationship Type Radio */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--color-text)',
                  }}
                >
                  Do you already have a customer account with this petrol pump?
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: requestType === 'existing_account' ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="requestType"
                      value="existing_account"
                      checked={requestType === 'existing_account'}
                      onChange={() => setRequestType('existing_account')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        Yes, I already deal with this petrol pump
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Connect to your existing ledger account using your assigned customer code.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: requestType === 'new_relationship' ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="requestType"
                      value="new_relationship"
                      checked={requestType === 'new_relationship'}
                      onChange={() => setRequestType('new_relationship')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        No, I want to request a new customer relationship
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        Request the station to open a new credit/fuel account for you.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional Inputs */}
              {requestType === 'existing_account' ? (
                <>
                  <Input
                    label="Customer Code assigned by pump"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    placeholder="e.g. AP-100 or CUST-001"
                    required
                  />

                  <Input
                    label="Registered Mobile Phone (for verification)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Business or Trade Name (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Ahmed Logistics / Personal Vehicle"
                  />
                  <Input
                    label="Contact Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                  />
                </>
              )}

              {/* Security notice */}
              <div
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                🔒 <strong>Privacy & Security:</strong> For security and confidentiality, financial
                details and statements are never displayed until authorized by the petrol pump administrator.
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '6px',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Submit Request for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}