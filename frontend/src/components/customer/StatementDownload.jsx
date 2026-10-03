import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { downloadMyStatement } from '../../api/customerApi';
import { downloadPumpStatement } from '../../api/customerPumpApi';
import { toInputDatePK } from '../../utils/pkFormat';

export const StatementDownload = ({ customerCode, pumpAccountId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const todayStr = React.useMemo(() => toInputDatePK(new Date()), []);

  const downloadExcel = async () => {
    setLoading(true); setError('');
    try {
      const params = { startDate: start || undefined, endDate: end || undefined };
      const res = pumpAccountId
        ? await downloadPumpStatement(pumpAccountId, params)
        : await downloadMyStatement(params);
      const blob = new Blob([res.data], { type: res.headers?.['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${customerCode || 'account'}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download statement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="statement-download-panel surface-panel" role="region" aria-label="Download statement">
      <div className="sdp-row">
        <div className="sdp-field">
          <label className="sdp-label">From</label>
          <input className="sdp-input" type="date" value={start} onChange={e => setStart(e.target.value)} max={todayStr} />
        </div>

        <div className="sdp-field">
          <label className="sdp-label">To</label>
          <input className="sdp-input" type="date" value={end} onChange={e => setEnd(e.target.value)} max={todayStr} />
        </div>

        <div className="sdp-actions">
          <Button onClick={downloadExcel} loading={loading} variant="primary">⬇ Download</Button>
        </div>
      </div>

      {error ? <div className="sdp-error">{error}</div> : null}
    </div>
  );
};