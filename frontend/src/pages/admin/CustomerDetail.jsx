import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wallet, CreditCard, Calendar, FileText, AlertCircle } from 'lucide-react';
import { getCustomerById, updateCustomer } from '../../api/customerApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/dashboard/StatCard';
import { formatPKR, formatDate } from '../../utils/pkFormat';

export default function CustomerDetail() {
	const { id } = useParams();
	const nav = useNavigate();
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [form, setForm] = useState({ phone: '', address: '', creditLimit: '', notes: '', isActive: true });

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError('');
			try {
				const res = await getCustomerById(id);
				const data = res.data.data || res.data;
				setProfile(data);
				setForm({
					phone: data.phone || '',
					address: data.address || '',
					creditLimit: data.creditLimit ?? 0,
					notes: data.notes || '',
					isActive: Boolean(data.isActive),
				});
			} catch (err) {
				setError(err.response?.data?.message || 'Customer not found');
				setProfile(null);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	const hasOutstandingBalance = Number(profile?.currentBalance || 0) > 0;

	const dirty = useMemo(() => {
		if (!profile) return false;
		return ['phone', 'address', 'creditLimit', 'notes', 'isActive'].some((key) => {
			const current = key === 'creditLimit' ? String(form[key] ?? '') : String(form[key] ?? '');
			const original = key === 'creditLimit' ? String(profile[key] ?? '') : String(profile[key] ?? '');
			return current !== original;
		});
	}, [form, profile]);

	const handleSave = async (e) => {
		e.preventDefault();
		setSaving(true);
		setError('');
		try {
			const payload = {
				phone: form.phone,
				address: form.address,
				creditLimit: form.creditLimit === '' ? 0 : Number(form.creditLimit),
				notes: form.notes,
				isActive: form.isActive,
			};
			const res = await updateCustomer(id, payload);
			setProfile(res.data.data || res.data);
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update customer');
		} finally {
			setSaving(false);
		}
	};

	const openStatementLedger = () => {
		nav(`/admin/transactions?customerId=${id}`);
	};

	if (loading) {
		return <SkeletonCard />;
	}

	if (error && !profile) {
		return <EmptyState icon={<AlertCircle size={36} color="var(--color-danger)" />} title="Could not load customer" description={error} action={() => nav('/admin/customers')} actionLabel="Back to Customers" />;
	}

	return (
		<div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
			<PageHeader
				title={profile?.customerCode || 'Customer Profile'}
				subtitle={`${profile?.userId?.name || ''} · ${profile?.userId?.email || ''}`}
				actions={
					<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
						<Button variant="outline" onClick={() => nav('/admin/customers')}>
							<ArrowLeft size={16} />
							<span>Back</span>
						</Button>
						<Badge variant={profile?.isActive ? 'success' : 'neutral'}>
							{profile?.isActive ? 'Active' : 'Inactive'}
						</Badge>
						<Button variant="secondary" onClick={openStatementLedger}>
							<FileText size={16} />
							<span>Open Statement Ledger</span>
						</Button>
					</div>
				}
			/>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
				<StatCard
					title="Current Balance"
					value={formatPKR(Math.abs(profile?.currentBalance || 0))}
					icon={<Wallet size={20} />}
					description={Number(profile?.currentBalance || 0) > 0 ? 'Receivable outstanding' : 'Cleared'}
				/>
				<StatCard
					title="Credit Limit"
					value={formatPKR(profile?.creditLimit || 0)}
					icon={<CreditCard size={20} />}
					description="Allowed credit buffer"
				/>
				<StatCard
					title="Created On"
					value={profile?.createdAt ? formatDate(profile.createdAt) : '—'}
					icon={<Calendar size={20} />}
					description="Account enrollment date"
				/>
			</div>

			<Card title="Edit Customer Profile" subtitle="Keep billing and operational details accurate for the selected customer.">
				<form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '14px' }}>
						<Input label="Phone" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
						<Input label="Credit Limit (PKR)" type="text" inputMode="decimal" value={form.creditLimit} onChange={(e) => {
							const value = e.target.value;
							if (value === '' || /^\d*\.?\d*$/.test(value)) {
								setForm((current) => ({ ...current, creditLimit: value }));
							}
						}} />
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '14px' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Address</label>
							<textarea
								value={form.address}
								onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
								rows={3}
								style={{
									width: '100%',
									padding: '10px 12px',
									border: '1px solid var(--border-default)',
									borderRadius: 'var(--radius-md, 8px)',
									background: 'var(--bg-surface)',
									color: 'var(--text-primary)',
									fontSize: '14px',
									fontFamily: 'inherit',
									minHeight: 80,
								}}
							/>
						</div>

						<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
							<label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Notes</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
								rows={3}
								style={{
									width: '100%',
									padding: '10px 12px',
									border: '1px solid var(--border-default)',
									borderRadius: 'var(--radius-md, 8px)',
									background: 'var(--bg-surface)',
									color: 'var(--text-primary)',
									fontSize: '14px',
									fontFamily: 'inherit',
									minHeight: 80,
								}}
							/>
						</div>
					</div>

					<label style={{
						display: 'flex', alignItems: 'center', gap: '8px',
						fontSize: '14px', paddingTop: '4px',
						cursor: hasOutstandingBalance ? 'not-allowed' : 'pointer',
						opacity: hasOutstandingBalance ? 0.6 : 1,
					}}>
						<input
							type="checkbox"
							checked={form.isActive}
							disabled={hasOutstandingBalance}
							onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))}
						/>
						<span>Active customer account</span>
					</label>

					{error && (
						<p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>
							{error}
						</p>
					)}

					<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
						<Button type="button" variant="outline" onClick={() => nav('/admin/customers')}>
							Cancel
						</Button>
						<Button type="submit" loading={saving} disabled={!dirty}>
							Save Changes
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
