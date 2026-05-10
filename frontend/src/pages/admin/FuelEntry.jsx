import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers } from '../../api/customerApi';
import { createTransaction } from '../../api/transactionApi';
import { Button } from '../../components/ui/Button';
import { SectionHeader, Section } from '../../components/ui/Section';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { pkInputDateTimeToIso, toInputDateTimePK } from '../../utils/pkFormat';

const CARD = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-sm)',
  padding: 'var(--space-5)',
};

const SECTION_TITLE = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-text-muted)',
};

const fuelOptions = [
  { value: 'pmg', label: 'PMG' },
  { value: 'hsd', label: 'HSD' },
  { value: 'nr', label: 'NR' },
];

const formatMoney = (value) =>
  `PKR ${(Number(value) || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function FuelEntry() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerId: '',
    fuelType: 'pmg',
    fuelQuantity: '',
    rate: '',
    transactionDate: toInputDateTimePK(new Date()),
    vehicleNo: '',
  });
  const toast = useToast();

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCustomers(true);
      try {
        const res = await getCustomers({ limit: 100, sort: 'customerCode' });
        if (mounted) setCustomers(res.data?.data || []);
      } catch {
        if (mounted) setCustomers([]);
      } finally {
        if (mounted) setLoadingCustomers(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const amount = useMemo(() => {
    const quantity = Number(form.fuelQuantity) || 0;
    const rate = Number(form.rate) || 0;
    return quantity * rate;
  }, [form.fuelQuantity, form.rate]);

  const requiredComplete = useMemo(() => (
    Boolean(form.customerId)
    && Boolean(form.fuelQuantity) && Number(form.fuelQuantity) > 0
    && Boolean(form.rate) && Number(form.rate) > 0
    && Boolean(form.transactionDate)
  ), [form.customerId, form.fuelQuantity, form.rate, form.transactionDate]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    

    if (!form.customerId) {
      setError('Please select a customer.');
      return;
    }

    if (!form.fuelQuantity || Number(form.fuelQuantity) <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    if (!form.rate || Number(form.rate) <= 0) {
      setError('Please enter a valid rate.');
      return;
    }

    setLoading(true);
    try {
      await createTransaction({
        customerId: form.customerId,
        transactionType: 'fuel_sale',
        fuelType: form.fuelType,
        fuelQuantity: Number(form.fuelQuantity),
        rate: Number(form.rate),
        totalAmount: amount,
        vehicleNo: form.vehicleNo || '',
        transactionDate: pkInputDateTimeToIso(form.transactionDate),
      });

      try {
        const customer = customers.find((c) => c._id === form.customerId);
        toast.success({
          title: 'Fuel entry saved',
          message: `${customer?.userId?.name || 'Customer'} · ${formatMoney(amount)}`,
          duration: 5000,
        });
      } catch (e) {}
      setForm((current) => ({
        ...current,
        fuelQuantity: '',
        rate: '',
        vehicleNo: '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fuel entry.');
      try {
        toast.error({ title: 'Failed', message: err.response?.data?.message || 'Failed to save fuel entry.' });
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn form-page">
      <div className="form-hero">
        <div className="form-hero__titleGroup">
          <h1 className="form-hero__title">Fuel Entry</h1>
          <p className="form-hero__subtitle">Record PMG, HSD, or NR sales from this separate admin page.</p>
        </div>
      </div>

      <div className="report-stat-grid">
        <div className="financial-summary-card">
          <div style={SECTION_TITLE}>Fuel Types</div>
          <div style={{ marginTop: 'var(--space-2)', fontWeight: 700 }}>PMG, HSD, NR</div>
          <div className="financial-summary-hint">Choose the fuel type before saving the sale.</div>
        </div>
        <div className="financial-summary-card">
          <div style={SECTION_TITLE}>Entry Amount</div>
          <div style={{ marginTop: 'var(--space-2)', fontWeight: 700 }}>{formatMoney(amount)}</div>
          <div className="financial-summary-hint">Calculated from quantity multiplied by rate.</div>
        </div>
      </div>

      <form onSubmit={submit} className="form-section">
        <div className="form-surface form-surface--padded">
          <div className="form-section__header">
            <div>
              <div className="form-section__title">Customer</div>
              <div className="form-section__subtitle">Choose the account that will receive this fuel sale.</div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <select
              value={form.customerId}
              onChange={(e) => setField('customerId', e.target.value)}
              className="financial-filter-control"
              style={{ width: '100%' }}
              required
            >
              <option value="">Select customer</option>
              {loadingCustomers ? <option value="">Loading customers...</option> : null}
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.userId?.name || 'Unknown'} · {customer.customerCode}
                </option>
              ))}
            </select>
          </div>

          {/* Selected customer quick details */}
          {form.customerId ? (
            (() => {
              const cust = customers.find((c) => c._id === form.customerId) || {};
              return (
                <div style={{ marginTop: 'var(--space-3)', padding: '12px 16px', background: 'var(--color-surface-muted)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700 }}>{cust.userId?.name || 'Unknown'}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{cust.customerCode || ''}</div>
                  <div style={{ marginTop: 6, fontSize: '0.95rem' }}>Phone: {cust.phone || '—'}</div>
                  <div style={{ fontSize: '0.95rem' }}>Balance: {cust.currentBalance != null ? `PKR ${Number(cust.currentBalance).toLocaleString()}` : '—'}</div>
                </div>
              );
            })()
          ) : null}

          <div className="form-grid-3" style={{ marginTop: 'var(--space-5)' }}>
            <div className="form-field">
              <label className="form-field__label">Fuel Type</label>
              <select
                value={form.fuelType}
                onChange={(e) => setField('fuelType', e.target.value)}
                className="financial-filter-control"
              >
                {fuelOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Quantity"
              type="number"
              step="0.01"
              min="0"
              value={form.fuelQuantity}
              onChange={(e) => setField('fuelQuantity', e.target.value)}
              hint="Enter liters sold."
              required
            />
            <Input
              label="Rate"
              type="number"
              step="0.01"
              min="0"
              value={form.rate}
              onChange={(e) => setField('rate', e.target.value)}
              hint="Rate per liter."
              required
            />
            <Input
              label="Date & Time"
              type="datetime-local"
              value={form.transactionDate}
              onChange={(e) => setField('transactionDate', e.target.value)}
              required
            />
            <Input
              label="Vehicle No."
              value={form.vehicleNo}
              onChange={(e) => setField('vehicleNo', e.target.value)}
              hint="Enter the vehicle registration or identification number."
            />
          </div>
        </div>

        <div className="form-footer">
          <div className="form-footer__inner">
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Save Fuel Entry</div>
              <div className="form-note" style={{ marginTop: 2 }}>Review quantity, rate, and date before saving the transaction.</div>
            </div>
            <div className="form-footer__actions">
              <Button type="button" variant="ghost" onClick={() => navigate('/admin/transactions')}>Back to Ledger</Button>
              <Button type="submit" loading={loading} disabled={!requiredComplete || loading}>Save Fuel Entry</Button>
            </div>
          </div>
        </div>

        {error ? <EmptyState icon="⚠️" title="Could not save fuel entry" description={error} /> : null}
      </form>
    </div>
  );
}