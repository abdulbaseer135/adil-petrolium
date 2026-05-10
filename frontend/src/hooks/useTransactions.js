import { useState, useEffect, useCallback } from 'react';
import { getTransactions } from '../api/transactionApi';
import { API_BASE_URL } from '../api/axiosClient';

export const useTransactions = ({ customerId, startDate, endDate, type, page = 1, limit = 20 } = {}) => {
  const [data,    setData]    = useState([]);
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getTransactions({ customerId, startDate, endDate,
        transactionType: type, page, limit });
      setData(res.data.data    || []);
      setMeta(res.data.meta    || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [customerId, startDate, endDate, type, page, limit]);

  useEffect(() => { load(); }, [load]);

  // Real-time updates via Server-Sent Events (SSE).
  useEffect(() => {
    if (!customerId) return undefined;

    const url = `${API_BASE_URL.replace(/\/$/, '')}/events/transactions?customerId=${customerId}`;
    let es;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch (e) {
      return undefined;
    }

    const handleCreated = () => { load(); };
    const handleVoided = () => { load(); };
    const handleMessage = () => { /* fallback: reload */ load(); };

    es.addEventListener('transaction.created', handleCreated);
    es.addEventListener('transaction.voided', handleVoided);
    es.addEventListener('message', handleMessage);

    es.onerror = () => {
      // On error, close and rely on manual reload (avoid infinite reconnect loops)
      try { es.close(); } catch (e) {}
    };

    return () => {
      try {
        es.removeEventListener('transaction.created', handleCreated);
        es.removeEventListener('transaction.voided', handleVoided);
        es.removeEventListener('message', handleMessage);
        es.close();
      } catch (e) {}
    };
  }, [customerId, load]);

  return { data, meta, loading, error, reload: load };
};