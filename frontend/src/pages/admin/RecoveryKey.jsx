import React, { useState } from 'react';
import { regenerateRecoveryKey } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { RecoveryKeyBox } from '../../components/ui/RecoveryKeyBox';

const RecoveryKey = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    setNewKey('');

    try {
      const response = await regenerateRecoveryKey();
      setNewKey(response.data.newRecoveryKey);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate recovery key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page" style={{ padding: 'var(--space-6)', maxWidth: '640px', margin: '0 auto' }}>
      <div className="form-hero">
        <div className="form-hero__titleGroup">
          <h1 className="form-hero__title">Recovery Key Management</h1>
          <p className="form-hero__subtitle">Generate a new recovery key and save it securely before leaving the page.</p>
        </div>
      </div>

      <div className="form-surface form-surface--padded form-section">
        <div className="form-section__header">
          <div>
            <div className="form-section__title">Regenerate Recovery Key</div>
            <div className="form-section__subtitle">The old key will be invalidated when a new one is generated.</div>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'color-mix(in oklch, var(--color-error) 8%, var(--color-surface))',
            color: 'var(--color-error)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in oklch, var(--color-error) 20%, var(--color-divider))',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-sm)',
          }}>
            {error}
          </div>
        )}

        {newKey && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <RecoveryKeyBox recoveryKey={newKey} />
          </div>
        )}

        <div className="form-actions--stacked">
          <Button
            onClick={handleRegenerate}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Generating...' : 'Generate New Recovery Key'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryKey;