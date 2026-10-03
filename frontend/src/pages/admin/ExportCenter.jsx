import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, BarChart3, Download } from 'lucide-react';
import { exportDaily, exportMonthly, exportYearly } from '../../api/reportApi';
import { toInputDatePK } from '../../utils/pkFormat';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/dashboard/StatCard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const triggerDownload = async (request, filename) => {
  const res = await request();
  const blob = new Blob([res.data], { type: res.headers?.['content-type'] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function ExportCenter() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [date, setDate] = useState(toInputDatePK());
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [yearOnly, setYearOnly] = useState(currentYear);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const todayStr = useMemo(() => toInputDatePK(), []);
  const availableYears = useMemo(() => {
    const years = [];
    for (let y = 2023; y <= currentYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const availableMonths = useMemo(() => {
    if (year < currentYear) {
      return MONTHS.map((label, index) => ({ value: index + 1, label }));
    }
    return MONTHS
      .map((label, index) => ({ value: index + 1, label }))
      .filter((m) => m.value <= currentMonth);
  }, [year, currentYear, currentMonth]);

  // If year changes and makes current month invalid, adjust it
  useEffect(() => {
    if (year === currentYear && month > currentMonth) {
      setMonth(currentMonth);
    }
  }, [year, currentYear, currentMonth, month]);

  const run = async (key, fn) => {
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));
    try {
      await fn();
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [key]: err.response?.data?.message || 'Export failed. Try again.',
      }));
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Export Center"
        subtitle="Download formatted operational reports for daily activity, monthly billing, and annual summaries."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Badge variant="info">Admin Export</Badge>
            <Badge variant="success">Excel / XLSX</Badge>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Daily Export"
          value={date}
          icon={<Calendar size={20} />}
          description="Selected posting date"
        />
        <StatCard
          title="Monthly Export"
          value={`${MONTHS[month - 1]} ${year}`}
          icon={<CalendarDays size={20} />}
          description="Selected billing period"
        />
        <StatCard
          title="Yearly Export"
          value={String(yearOnly)}
          icon={<BarChart3 size={20} />}
          description="Selected annual range"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Daily Card */}
        <Card
          title="Daily Report"
          subtitle="Download the full daily workbook for one date."
          headerActions={<Badge variant="primary">Excel</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayStr}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>

            <Button
              onClick={() => run('daily', () => triggerDownload(() => exportDaily(date), `petro_daily_${date}.xlsx`))}
              loading={loading.daily}
              fullWidth
            >
              <Download size={16} />
              <span>Export Daily Excel</span>
            </Button>

            {errors.daily && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>
                {errors.daily}
              </p>
            )}
          </div>
        </Card>

        {/* Monthly Card */}
        <Card
          title="Monthly Report"
          subtitle="Download a month-by-month workbook for billing and review."
          headerActions={<Badge variant="primary">Excel</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
              <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {availableYears.map((optionYear) => (
                  <option key={optionYear} value={optionYear}>{optionYear}</option>
                ))}
              </Select>
            </div>

            <Button
              onClick={() =>
                run('monthly', () =>
                  triggerDownload(
                    () => exportMonthly(year, month),
                    `petro_monthly_${year}_${String(month).padStart(2, '0')}.xlsx`
                  )
                )
              }
              loading={loading.monthly}
              fullWidth
            >
              <Download size={16} />
              <span>Export Monthly Excel</span>
            </Button>

            {errors.monthly && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>
                {errors.monthly}
              </p>
            )}
          </div>
        </Card>

        {/* Yearly Card */}
        <Card
          title="Yearly Report"
          subtitle="Download an annual Excel statement grouped by customer."
          headerActions={<Badge variant="success">Excel</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Select label="Financial Year" value={yearOnly} onChange={(e) => setYearOnly(Number(e.target.value))}>
              {availableYears.map((optionYear) => (
                <option key={optionYear} value={optionYear}>{optionYear}</option>
              ))}
            </Select>

            <Button
              onClick={() =>
                run('yearly', () =>
                  triggerDownload(() => exportYearly(yearOnly), `petro_yearly_${yearOnly}.xlsx`)
                )
              }
              loading={loading.yearly}
              fullWidth
            >
              <Download size={16} />
              <span>Export Yearly Excel</span>
            </Button>

            {errors.yearly && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>
                {errors.yearly}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}