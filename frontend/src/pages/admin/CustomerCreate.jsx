import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { createCustomer } from '../../api/customerApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Section as SectionCard } from '../../components/ui/Section';
import { PageHeader } from '../../components/layout/PageHeader';
import { useToast } from '../../hooks/useToast';

const initialForm = {
  name: '',
  customerCode: '',
  phone: '',
  email: '',
  creditLimit: '',
  openingBalance: '',
  address: '',
  vehicleInfo: '',
  notes: '',
};

const FieldBlock = ({ label, hint, error, required, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
    <label
      style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--color-text-muted)',
      }}
    >
      {label} {required ? <span style={{ color: 'var(--color-notification)' }}>*</span> : null}
    </label>

    {children}

    {hint ? (
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        {hint}
      </span>
    ) : null}

    {error ? (
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
        {error}
      </span>
    ) : null}
  </div>
);

const InfoChip = ({ color, children }) => (
  <span
    style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      padding: '2px 10px',
      borderRadius: 'var(--radius-full)',
      background: `color-mix(in oklch, ${color} 12%, var(--color-surface))`,
      color,
      border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

const textareaStyle = {
  width: '100%',
  padding: 'var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  resize: 'vertical',
  fontSize: 'var(--text-sm)',
  lineHeight: 1.6,
  outline: 'none',
};

export default function CustomerCreate() {
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [created, setCreated] = useState(null);

  const requiredComplete = useMemo(() => (
    Boolean(form.name.trim()) &&
    Boolean(form.customerCode.trim())
  ), [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setValidationErrors({});

    try {
      const payload = {
        ...form,
        customerCode: form.customerCode.trim().toUpperCase(),
        creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : 0,
      };

      const res = await createCustomer(payload);
      const data = res.data.data || res.data;
      setCreated(data);
      try {
        toast.success({
          title: 'Customer account created',
          message: `Account ${data.profile?.customerCode || data.customerCode || ''} created successfully`,
          duration: 6000,
        });
      } catch (e) {}
      setForm(initialForm);
      nav('/admin/customers');
    } catch (err) {
      const errData = err.response?.data;

      if (errData?.errors && Array.isArray(errData.errors)) {
        const fieldErrors = {};
        errData.errors.forEach((item) => {
          fieldErrors[item.field] = item.message;
        });
        setValidationErrors(fieldErrors);
        const msg = errData.message || 'Validation failed';
        try {
          toast.error({ title: 'Submission Error', message: msg, duration: 7000 });
        } catch (e) {}
      } else {
        const msg = errData?.message || 'Failed to create customer account';
        try {
          toast.error({ title: 'Submission Error', message: msg, duration: 7000 });
        } catch (e) {}
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Add Customer Account"
        subtitle="Create a station ledger account. Customers manage their own logins online and link to this account to view statements."
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="outline" onClick={() => nav('/admin/customers')}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>
            <Badge variant="info">Ledger Account</Badge>
            <Badge variant={requiredComplete ? 'success' : 'warning'}>
              {requiredComplete ? 'Required Complete' : 'Required Pending'}
            </Badge>
          </div>
        }
      />

      {created ? (
        <EmptyState
          icon={<CheckCircle2 size={36} color="var(--color-success)" />}
          title="Customer account created successfully"
          description={`Account ${created.profile?.customerCode || created.customerCode || ''} is ready.`}
          action={() => nav(`/admin/customers/${created.profile?._id || created._id}`)}
          actionLabel="Open Customer"
        />
      ) : null}

      <form onSubmit={handleSubmit} className="form-section">
        <SectionCard
          title="Station Account Details"
          description="Customer code and station-specific business information. No login credentials are required here."
          right={<Badge variant="primary">Pump Account</Badge>}
        >
          <div className="form-grid-12">
            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Customer / Business Name"
                placeholder="e.g. Ahmed Traders"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                error={validationErrors.name}
                required
              />
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Customer Code"
                placeholder="e.g. AP-100 or CNIC"
                value={form.customerCode}
                onChange={(e) => setForm((current) => ({ ...current, customerCode: e.target.value }))}
                error={validationErrors.customerCode}
                required
                hint="Unique station customer code used for connection matching"
              />
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Phone Number"
                type="tel"
                placeholder="03001234567"
                value={form.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  setForm((current) => ({ ...current, phone: value }));
                }}
                error={validationErrors.phone}
                hint="Contact phone number on record for this customer"
              />
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Email (Optional)"
                type="email"
                placeholder="customer@example.com"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                error={validationErrors.email}
                hint="Optional business email"
              />
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Credit Limit (PKR)"
                type="number"
                placeholder="0"
                value={form.creditLimit}
                onChange={(e) => setForm((current) => ({ ...current, creditLimit: e.target.value }))}
                error={validationErrors.creditLimit}
                hint="Maximum credit allowed for this customer"
              />
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <Input
                label="Opening Balance (PKR)"
                type="number"
                placeholder="0"
                value={form.openingBalance}
                onChange={(e) => setForm((current) => ({ ...current, openingBalance: e.target.value }))}
                error={validationErrors.openingBalance}
                hint="Existing balance owed (leave 0 if none)"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Profile Details"
          description="Operational notes used by staff for delivery, billing, and customer servicing."
          right={
            <InfoChip color="var(--color-blue)">Optional Fields</InfoChip>
          }
        >
          <div className="form-grid-2">
            <div className="form-field">
              <FieldBlock label="Address" error={validationErrors.address}>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                  rows={2}
                  style={{ ...textareaStyle, minHeight: 84 }}
                />
              </FieldBlock>
            </div>

            {/* Vehicle info removed from create form; handled separately in profile editing */}

            {/* Notes removed from create form per request */}
          </div>
        </SectionCard>

        {/* Errors are shown via toast (top-center) using useToast(). */}

        <div className="form-footer">
          <div className="form-footer__inner">
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Create Customer Account</div>
            <div className="form-note" style={{ marginTop: 2 }}>
              Validate the form before saving customer access and profile data.
            </div>
          </div>

          <div className="form-footer__actions">
            <Button type="button" variant="secondary" onClick={() => nav('/admin/customers')}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!requiredComplete || saving}>
              Create Customer
            </Button>
          </div>
          </div>
        </div>
      </form>
    </div>
  );
}