import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCustomers } from '../../api/customerApi';
import { getTransactions, voidTransaction } from '../../api/transactionApi';
import { TransactionForm } from '../../components/admin/TransactionForm';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionHeader } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { usePagination } from '../../hooks/usePagination';
import {
  formatCurrencyPK,
  formatDatePK,
  formatDateTimePK,
  formatNumberPK,
  formatRatePK,
  PK_TIMEZONE,
} from '../../utils/pkFormat';

const TYPE_VARIANTS = {
  fuel_sale: 'warning',
  payment: 'success',
  adjustment: 'primary',
  credit_note: 'primary',
  opening_balance: 'neutral',
};

const CARD = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-sm)',
};

const SECTION_TITLE = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const selectStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
};

const tableHeadStyle = {
  padding: 'var(--space-2) var(--space-3)',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--color-divider)',
  whiteSpace: 'nowrap',
};

const cellStyle = {
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 'var(--text-xs)',
  verticalAlign: 'middle',
};

const numericCellStyle = {
  ...cellStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const ellipsisStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const formatMoney = formatCurrencyPK;
const formatNumber = formatNumberPK;
const formatRate = formatRatePK;
const formatDateTime = formatDateTimePK;
const formatDate = formatDatePK;
const formatBalance = (value) => formatCurrencyPK(Math.abs(Number(value) || 0));

const titleize = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const StatementCard = ({ label, value, accent, hint }) => (
  <div
    style={{
      ...CARD,
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minHeight: 'auto',
    }}
  >
    <div style={SECTION_TITLE}>{label}</div>
    <div
      style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        color: accent || 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
    {hint ? (
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500, marginTop: '2px' }}>
        {hint}
      </div>
    ) : null}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
    <label style={SECTION_TITLE}>{label}</label>
    {children}
  </div>
);

export default function Transactions() {
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    customerId: '',
    startDate: '',
    endDate: '',
  });

  const [draftFilters, setDraftFilters] = useState({
    customerId: '',
    startDate: '',
    endDate: '',
  });

  const [showCreate, setShowCreate] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const { page, limit, goTo } = usePagination(20);

  const customerIdFromUrl = searchParams.get('customerId');
  const inFlightRequestRef = useRef('');
  const syncedCustomerRef = useRef('');
  const [filtersReady, setFiltersReady] = useState(!customerIdFromUrl);

  const loadCustomers = useCallback(async () => {
    setCustomerLoading(true);
    try {
      const res = await getCustomers({ limit: 100, sort: 'customerCode' });
      setCustomers(res.data?.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  const handleCreateSuccess = () => {
    setShowCreate(false);
    loadTransactions();
  };

  const loadTransactions = useCallback(async () => {
    const requestKey = JSON.stringify({
      page,
      limit,
      customerId: filters.customerId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    if (inFlightRequestRef.current === requestKey) return;
    inFlightRequestRef.current = requestKey;

    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit,
        sort: '-transactionDate',
        customerId: filters.customerId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };

      const res = await getTransactions(params);
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load statement');
    } finally {
      if (inFlightRequestRef.current === requestKey) {
        inFlightRequestRef.current = '';
      }
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!customerIdFromUrl) {
      setFiltersReady(true);
      return;
    }

    if (syncedCustomerRef.current === customerIdFromUrl) {
      setFiltersReady(true);
      return;
    }

    syncedCustomerRef.current = customerIdFromUrl;
    setDraftFilters((current) => ({ ...current, customerId: customerIdFromUrl }));
    setFilters((current) => ({ ...current, customerId: customerIdFromUrl }));
    goTo(1);
    setFiltersReady(true);
  }, [customerIdFromUrl, goTo]);

  useEffect(() => {
    if (!filtersReady) return;
    loadTransactions();
  }, [filtersReady, loadTransactions]);

  const applyFilters = () => {
    setFilters(draftFilters);
    goTo(1);
  };

  const resetFilters = () => {
    const cleared = { customerId: '', startDate: '', endDate: '' };
    setDraftFilters(cleared);
    setFilters(cleared);
    goTo(1);
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;

    setVoidLoading(true);
    try {
      await voidTransaction(voidTarget.id || voidTarget._id, voidReason.trim());
      setVoidTarget(null);
      setVoidReason('');
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to void transaction');
    } finally {
      setVoidLoading(false);
    }
  };

  const selectedCustomer = useMemo(
    () => customers.find((customer) => (customer.id || customer._id) === filters.customerId),
    [customers, filters.customerId]
  );

  const isStatementMode = Boolean(filters.customerId);

  const statementRows = useMemo(() => {
    let balance = 0;

    const ordered = [...rows].sort(
      (a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)
    );

    return ordered
      .map((tx) => {
        const debit = Number(tx.totalAmount) || 0;
        const credit = Number(tx.paymentReceived) || 0;
        balance += debit - credit;

        return {
          ...tx,
          id: tx.id || tx._id,
          debit,
          credit,
          runningBalance: balance,
        };
      });
  }, [rows]);

  const totals = useMemo(
    () =>
      statementRows.reduce(
        (acc, tx) => {
          if (!tx.isVoided) {
            acc.sales += tx.debit;
            acc.payments += tx.credit;
            if (tx.transactionType === 'fuel_sale') {
              acc.totalFuel += Number(tx.fuelQuantity) || 0;
            }
          }
          return acc;
        },
        { sales: 0, payments: 0, totalFuel: 0 }
      ),
    [statementRows]
  );

  const openingBalance = statementRows.length
    ? Number(statementRows[0].runningBalance || 0) -
      Number(statementRows[0].debit || 0) +
      Number(statementRows[0].credit || 0)
    : 0;

  const closingBalance = totals.sales - totals.payments;

  const productTotals = useMemo(
    () =>
      statementRows.reduce(
        (acc, tx) => {
          const fuelType = String(tx.fuelType || '').toLowerCase();
          const quantity = Number(tx.fuelQuantity) || 0;
          if (fuelType === 'pmg') acc.pmg += quantity;
          if (fuelType === 'hsd') acc.hsd += quantity;
          if (fuelType === 'nr') acc.nr += quantity;
          return acc;
        },
        { pmg: 0, hsd: 0, nr: 0 }
      ),
    [statementRows]
  );

  const activeCount = statementRows.filter((tx) => !tx.isVoided).length;
  const voidedCount = statementRows.filter((tx) => tx.isVoided).length;

  const handleShareStatement = useCallback(() => {
    if (!isStatementMode || !selectedCustomer) return;

    const formatWordDate = (value) => {
      const date = new Date(value);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: PK_TIMEZONE });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formatWordDateTime = (value) => {
      const date = new Date(value);
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short', timeZone: PK_TIMEZONE });
      const year = date.getFullYear();
      const time = date
        .toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: PK_TIMEZONE,
        })
        .toLowerCase();
      return `${day}-${month}-${year}, ${time}`;
    };

    const rowsHtml = statementRows
      .map(
        (tx) => `
          <tr>
            <td>${escapeHtml(formatWordDateTime(tx.transactionDate))}</td>
            <td>${escapeHtml(
              tx.transactionType === 'payment'
                ? 'Payment'
                : tx.transactionType === 'fuel_sale'
                  ? 'Sale'
                  : tx.transactionType === 'opening_balance'
                    ? 'Opening Balance'
                    : 'Sale'
            )}</td>
            <td>${escapeHtml(tx.fuelType ? tx.fuelType.toUpperCase() : '-')}</td>
            <td>${escapeHtml(
              tx.transactionType === 'payment' ? '-' : tx.vehicleNo || tx.customerId?.vehicleInfo || selectedCustomer.vehicleInfo || '-'
            )}</td>
            <td class="num">${escapeHtml(tx.fuelQuantity ? formatNumber(tx.fuelQuantity) : '-')}</td>
            <td class="num">${escapeHtml(tx.rate ? formatRate(tx.rate) : '-')}</td>
            <td class="num">${escapeHtml(tx.debit ? formatMoney(tx.debit) : '-')}</td>
            <td class="num">${escapeHtml(tx.credit ? formatMoney(tx.credit) : '-')}</td>
            <td class="num">${escapeHtml(formatBalance(tx.runningBalance))}</td>
          </tr>
        `
      )
      .join('');

    const accountName = selectedCustomer.userId?.name || 'Customer';
    const address = selectedCustomer.address || '—';
    const phone = selectedCustomer.phone || selectedCustomer.userId?.phone || '—';
    const email = selectedCustomer.userId?.email || '—';
    const accountNature = 'Customer Account';
    const dateFrom = filters.startDate ? formatWordDate(filters.startDate) : 'Beginning';
    const dateTo = filters.endDate ? formatWordDate(filters.endDate) : 'Today';
    const currentBalance = Number(selectedCustomer.currentBalance || 0);
    const balanceRemark = closingBalance > 0 ? 'Amount receivable' : 'Advance credit balance';
    const remainingBalance = closingBalance;

    const html = `
      <!doctype html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Statement - ${escapeHtml(accountName)}</title>
        <style>
          body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; margin: 0; color: #1f2937; background: #ffffff; }
          .sheet { max-width: 1120px; margin: 0 auto; padding: 24px; }
          .page-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: #111827; }
          .page-subtitle { margin-top: 6px; font-size: 13px; color: #6b7280; }
          .summary-title { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; font-weight: 700; margin-bottom: 10px; }
          .buyer-section { margin-top: 12px; border: 1px solid #d1d5db; border-radius: 18px; overflow: hidden; }
          .buyer-header { background: linear-gradient(90deg, #0f172a 0, #1f2937 100%); color: #fff; padding: 14px 18px; }
          .buyer-header .title { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
          .buyer-header .desc { font-size: 12px; opacity: 0.85; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 9px 10px; font-size: 12px; vertical-align: top; }
          th { background: #f3f4f6; text-align: left; color: #4b5563; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
          tbody tr:nth-child(even) td { background: #fcfcfd; }
          .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
          .foot { margin-top: 14px; font-size: 10px; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="page-title">Account Statement</div>
          <div class="page-subtitle">Full customer account statement with transaction details and closing balance.</div>

          <div style="margin-top:14px;font-size:12px;line-height:1.8">
            <div><strong>Customer:</strong> ${escapeHtml(accountName)}</div>
            <div><strong>Type:</strong> ${escapeHtml(accountNature)}</div>
            <div><strong>Phone:</strong> ${escapeHtml(phone)}</div>
            <div><strong>Email:</strong> ${escapeHtml(email)}</div>
            <div><strong>Address:</strong> ${escapeHtml(address)}</div>
            <div><strong>Current Balance:</strong> ${escapeHtml(formatBalance(currentBalance))}</div>
            <div><strong>Statement Period:</strong> ${escapeHtml(dateFrom)} - ${escapeHtml(dateTo)}</div>
            <div><strong>Account:</strong> ${escapeHtml(accountNature)}</div>
          </div>

          <div class="buyer-section">
            <div class="buyer-header">
              <div class="title">${escapeHtml(accountName)}</div>
              <div class="desc">
                Qty ${escapeHtml(formatNumber(totals.totalFuel || 0))} L ·
                Sale ${escapeHtml(formatMoney(totals.sales))} ·
                Payment ${escapeHtml(formatMoney(totals.payments))} ·
                Remaining ${escapeHtml(formatBalance(remainingBalance))}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Vehicle</th>
                  <th class="num">Qty</th>
                  <th class="num">Rate</th>
                  <th class="num">Debit</th>
                  <th class="num">Credit</th>
                  <th class="num">Balance</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>

          <table style="width:100%;margin-top:18px;border-collapse:collapse;table-layout:fixed">
            <tr>
              <td style="width:50%;padding:10px;border:1px solid #e5e7eb;background:#f8fafc;vertical-align:top">
                <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px">SALES DETAIL</div>
                <div style="font-size:12px;margin-bottom:6px">PMG ${escapeHtml(productTotals?.pmg ? formatNumber(productTotals.pmg) : '0')} L</div>
                <div style="font-size:12px;margin-bottom:6px">HSD ${escapeHtml(productTotals?.hsd ? formatNumber(productTotals.hsd) : '0')} L</div>
                <div style="font-size:12px;margin-bottom:6px">NR ${escapeHtml(productTotals?.nr ? formatNumber(productTotals.nr) : '0')} L</div>
                <div style="font-size:12px;font-weight:700;color:#E8312B">Total Dr. Transactions ${escapeHtml(String(statementRows.filter(t => !t.isVoided && (t.debit || t.totalAmount) > 0).length))}</div>
              </td>
              <td style="width:50%;padding:10px;border:1px solid #e5e7eb;background:#f8fafc;vertical-align:top">
                <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px">BALANCE SUMMARY</div>
                <div style="font-size:12px;margin-bottom:6px">Opening Balance: ${escapeHtml(formatBalance(openingBalance))}</div>
                <div style="font-size:12px;margin-bottom:6px">Total Sales: ${escapeHtml(formatMoney(totals.sales))}</div>
                <div style="font-size:12px;margin-bottom:6px">Total Payments: ${escapeHtml(formatMoney(totals.payments))}</div>
                <div style="font-size:12px;margin-bottom:6px;font-weight:700;color:${closingBalance > 0 ? '#C0392B' : '#27AE60'}">Closing Balance: ${escapeHtml(formatBalance(closingBalance))}</div>
                <div style="font-size:12px;font-style:italic;color:#2C3E50">Balance Remarks: ${escapeHtml(balanceRemark)}</div>
              </td>
            </tr>
          </table>

          <div class="foot">Prepared for customer sharing · Pakistan datetime format applied</div>
        </div>
      </body>
      </html>
    `;

    const safeName = String(accountName || 'customer')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    const fromPart = filters.startDate || 'start';
    const toPart = filters.endDate || 'today';
    const filename = `statement-${safeName}-${fromPart}-${toPart}.doc`;

    const wordBlob = new Blob([html], {
      type: 'application/msword;charset=utf-8',
    });

    const downloadUrl = URL.createObjectURL(wordBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  }, [
    isStatementMode,
    selectedCustomer,
    statementRows,
    filters.startDate,
    filters.endDate,
    totals.totalFuel,
    totals.sales,
    totals.payments,
    closingBalance,
    openingBalance,
  ]);

  return (
    <div>
    <div className="animate-fadeIn report-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader
        title={isStatementMode ? 'Customer Account Statement' : 'Account Statement'}
        subtitle={
          ''
        }
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            {isStatementMode ? (
              <Button variant="secondary" onClick={handleShareStatement}>
                ⬇ Download Statement
              </Button>
            ) : null}
            <Button onClick={() => setShowCreate(true)}>Receive Payment</Button>
          </div>
        }
      />

          <div className="financial-detail-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 'var(--space-3)', alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 4' }}>
            <Field label="Customer">
              <select
                value={draftFilters.customerId}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
                className="financial-filter-control"
                style={{ height: '40px', minHeight: '40px' }}
              >
                <option value="">All Customers</option>
                {customerLoading ? <option value="">Loading...</option> : null}
                {customers.map((customer) => (
                  <option key={customer.id || customer._id} value={customer.id || customer._id}>
                    {customer.customerCode} · {customer.userId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <Input
              label="From"
              type="date"
              value={draftFilters.startDate}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              style={{ height: '40px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 3' }}>
            <Input
              label="To"
              type="date"
              value={draftFilters.endDate}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              style={{ height: '40px' }}
            />
          </div>

          <div
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              gap: 'var(--space-2)',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              paddingBottom: '3px',
            }}
          >
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {isStatementMode && selectedCustomer ? (
        <div className="financial-detail-card" style={{ marginTop: 'var(--space-6)' }}>
          <div className="financial-detail-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-5)', borderBottom: '1px solid var(--color-divider)', paddingBottom: 'var(--space-5)' }}>
            <div style={{ borderRight: '1px solid var(--color-divider)', paddingRight: 'var(--space-5)' }}>
              <div style={SECTION_TITLE}>Account Holder</div>
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text)',
                }}
              >
                {selectedCustomer.userId?.name}
              </div>
              <div
                style={{
                  marginTop: 'var(--space-1)',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                Code: {selectedCustomer.customerCode}
              </div>
            </div>

            <div>
              <div style={SECTION_TITLE}>Contact Information</div>
              <div style={{ marginTop: 'var(--space-2)', display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Phone: </span>
                  <span style={{ fontWeight: 500 }}>{selectedCustomer.userId?.phone || '—'}</span>
                </div>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Address: </span>
                  <span style={{ fontWeight: 500 }}>{selectedCustomer.address || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="financial-detail-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
            <div>
              <div style={SECTION_TITLE}>Statement Period</div>
              <div style={{ marginTop: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {filters.startDate ? formatDate(filters.startDate) : 'Beginning'} to{' '}
                {filters.endDate ? formatDate(filters.endDate) : 'Today'}
              </div>
            </div>
            <div>
              <div style={SECTION_TITLE}>Current Balance</div>
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  fontWeight: 700,
                  fontSize: 'var(--text-base)',
                  color: closingBalance > 0 ? 'var(--color-error)' : 'var(--color-success)',
                }}
              >
                {formatMoney(closingBalance)}
              </div>
            </div>
            <div>
              <div style={SECTION_TITLE}>Entries Summary</div>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', display: 'flex', gap: 'var(--space-3)' }}>
                <span style={{ fontWeight: 500 }}>{activeCount} Active</span>
                <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>{voidedCount} Voided</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="report-stat-grid" style={{ marginTop: 'var(--space-6)' }}>
        <StatementCard
          label="Total Sales"
          value={formatMoney(totals.sales)}
          accent="var(--color-warning)"
          hint="Debit transactions in the statement."
        />
        <StatementCard
          label="Total Payments"
          value={formatMoney(totals.payments)}
          accent="var(--color-success)"
          hint="Credit transactions received."
        />
        <StatementCard
          label="Closing Balance"
          value={formatBalance(closingBalance)}
          accent={closingBalance > 0 ? 'var(--color-error)' : 'var(--color-primary)'}
          hint="Balance after all listed transactions."
        />
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={9} />
      ) : error ? (
        <EmptyState
          icon="⚠️"
          title="Could not load statement"
          description={error}
          action={loadTransactions}
          actionLabel="Try Again"
        />
      ) : statementRows.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No statement rows found"
          description={
            isStatementMode
              ? 'No transactions found for this customer in the selected period.'
              : 'Select a customer or date range, or record a new transaction.'
          }
          action={() => setShowCreate(true)}
          actionLabel="Record Entry"
        />
      ) : (
        <div className="financial-table-shell" style={{ marginTop: 'var(--space-6)' }}>
          <div className="financial-table-toolbar">
            <div>
              <h2
                style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                }}
              >
                {isStatementMode ? 'Customer Ledger' : 'Statement Ledger'}
              </h2>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-xs)',
                  marginTop: 2,
                }}
              >
                {isStatementMode
                  ? 'Single-customer statement with debit, credit, and running balance.'
                  : ''}
              </p>
            </div>

            <div className="financial-detail-chipRow">
              <Badge variant="success">Active {activeCount}</Badge>
              <Badge variant="error">Voided {voidedCount}</Badge>
            </div>
          </div>

          <div className="financial-table-wrap">
            <table className="financial-table" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '13%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>

              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th style={{ ...tableHeadStyle, padding: 'var(--space-3) var(--space-4)' }}>Date</th>
                  <th style={{ ...tableHeadStyle, padding: 'var(--space-3) var(--space-4)' }}>A/C Info</th>
                  <th style={{ ...tableHeadStyle, padding: 'var(--space-3) var(--space-4)' }}>Product</th>
                  <th style={{ ...tableHeadStyle, padding: 'var(--space-3) var(--space-4)' }}>Vehicle</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Qty</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Rate</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Debit</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Credit</th>
                  <th style={{ ...tableHeadStyle, textAlign: 'right', padding: 'var(--space-3) var(--space-4)' }}>Balance</th>
                </tr>
              </thead>

              <tbody>
                {statementRows.map((tx, idx) => {
                  const customer = tx.customerId || {};
                  const voided = Boolean(tx.isVoided);

                  return (
                    <tr
                      key={tx.id || tx._id || idx}
                      style={{
                        borderTop: idx === 0 ? 'none' : '1px solid var(--color-divider)',
                        background:
                          idx % 2
                            ? 'color-mix(in oklch, var(--color-surface-2) 40%, var(--color-surface))'
                            : 'transparent',
                        opacity: voided ? 0.65 : 1,
                        transition: 'background-color var(--transition-interactive)',
                      }}
                      onMouseEnter={(e) => {
                        if (!voided) {
                          e.currentTarget.style.background = 'color-mix(in oklch, var(--color-primary) 5%, var(--color-surface))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2
                          ? 'color-mix(in oklch, var(--color-surface-2) 40%, var(--color-surface))'
                          : 'transparent';
                      }}
                    >
                      <td style={{ ...cellStyle, padding: 'var(--space-3) var(--space-4)', ...ellipsisStyle }}>
                        <div className="is-strong">
                          {formatDate(tx.transactionDate || tx.date)}
                        </div>
                      </td>

                      <td style={{ ...cellStyle, padding: 'var(--space-3) var(--space-4)', ...ellipsisStyle }}>
                        <div className="is-strong">
                          {tx.transactionType === 'fuel_sale'
                            ? 'Sale'
                            : tx.transactionType === 'payment'
                            ? 'Payment'
                            : customer.customerCode || selectedCustomer?.customerCode || '—'}
                        </div>
                      </td>

                      <td style={{ ...cellStyle, padding: 'var(--space-3) var(--space-4)', ...ellipsisStyle }}>
                        {tx.fuelType ? String(tx.fuelType).toUpperCase() : '—'}
                      </td>

                      <td style={{ ...cellStyle, padding: 'var(--space-3) var(--space-4)', ...ellipsisStyle }}>
                        {tx.vehicleNo || customer.vehicleInfo || selectedCustomer?.vehicleInfo || '—'}
                      </td>

                      <td style={{ ...numericCellStyle, padding: 'var(--space-3) var(--space-4)' }} className="is-numeric">
                        {tx.fuelQuantity != null && tx.fuelQuantity !== ''
                          ? formatNumber(tx.fuelQuantity)
                          : '—'}
                      </td>

                      <td style={{ ...numericCellStyle, padding: 'var(--space-3) var(--space-4)' }} className="is-numeric">
                        {tx.rate != null && tx.rate !== '' ? formatRate(tx.rate) : '—'}
                      </td>

                      <td style={{ ...numericCellStyle, padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-warning)' }} className="is-numeric is-strong">
                        {tx.debit || tx.totalAmount ? formatMoney(tx.debit || tx.totalAmount) : '—'}
                      </td>

                      <td style={{ ...numericCellStyle, padding: 'var(--space-3) var(--space-4)', fontWeight: 600, color: 'var(--color-success)' }} className="is-numeric is-strong">
                        {tx.credit || tx.paymentReceived
                          ? formatMoney(tx.credit || tx.paymentReceived)
                          : '—'}
                      </td>

                      <td
                        style={{
                          ...numericCellStyle,
                          padding: 'var(--space-3) var(--space-4)',
                          fontWeight: 700,
                          fontSize: 'var(--text-sm)',
                          color:
                            Number(tx.runningBalance || tx.balanceValue || 0) > 0
                              ? 'var(--color-error)'
                              : 'var(--color-success)',
                        }}
                        className="is-numeric is-strong"
                      >
                        {formatBalance(tx.runningBalance || tx.balanceValue || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isStatementMode ? (
            <div className="financial-detail-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)' }}>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={SECTION_TITLE}>Sales Detail</div>
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>PMG</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(productTotals.pmg)} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>HSD</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(productTotals.hsd)} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>NR</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatNumber(productTotals.nr)} L</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Total Dr. Entries</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>
                      {statementRows.filter((tx) => (tx.debit || 0) > 0 && !tx.isVoided).length}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={SECTION_TITLE}>Balance Summary</div>
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Opening</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(openingBalance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Total Sales</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-warning)' }}>{formatMoney(totals.sales)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Total Payments</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>{formatMoney(totals.payments)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Closing Balance</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: closingBalance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                      {formatBalance(closingBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div
            style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--color-divider)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 56,
            }}
          >
            <div style={{ display: 'inline-flex' }}>
              <Pagination
                page={page}
                totalPages={meta?.totalPages}
                onPageChange={goTo}
              />
            </div>
          </div>
        </div>
      )}

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreate(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-5)',
              }}
            >
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Receive Payment</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  Choose a customer and record the received amount.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Close
              </Button>
            </div>

            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Field label="Customer">
                <select
                  value={draftFilters.customerId}
                  onChange={(e) =>
                    setDraftFilters((current) => ({
                      ...current,
                      customerId: e.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id || customer._id} value={customer.id || customer._id}>
                      {customer.customerCode} · {customer.userId?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {!draftFilters.customerId ? (
              <EmptyState
                icon="👤"
                title="Pick a customer first"
                description="A payment entry must be tied to a customer account."
              />
            ) : (
              (() => {
                const paymentCustomer = customers.find(
                  (customer) => (customer.id || customer._id) === draftFilters.customerId
                );

                return (
              <TransactionForm
                customerId={draftFilters.customerId}
                currentBalance={paymentCustomer?.currentBalance || closingBalance || 0}
                customerName={paymentCustomer?.userId?.name}
                customerCode={paymentCustomer?.customerCode}
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreate(false)}
              />
                );
              })()
            )}
          </div>
        </div>
      ) : null}

      {voidTarget ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            background: 'rgba(0,0,0,0.35)',
          }}
          onClick={() => !voidLoading && setVoidTarget(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
              padding: 'var(--space-6)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                marginBottom: 'var(--space-2)',
              }}
            >
              Reason for voiding
            </h3>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Add a clear reason before voiding this entry.
            </p>

            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={4}
              placeholder="e.g. Duplicate entry, wrong customer, wrong amount"
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-5)',
              }}
            >
              <Button
                variant="ghost"
                onClick={() => {
                  if (!voidLoading) {
                    setVoidTarget(null);
                    setVoidReason('');
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                loading={voidLoading}
                disabled={!voidReason.trim()}
                onClick={handleVoid}
              >
                Void
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  

);
}