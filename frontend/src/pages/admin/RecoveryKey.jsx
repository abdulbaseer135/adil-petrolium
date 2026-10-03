import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { regenerateRecoveryKey } from '../../api/authApi';
import { Button } from '../../components/ui/Button';
import { RecoveryKeyBox } from '../../components/ui/RecoveryKeyBox';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';

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
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Recovery Key Management"
        subtitle="Generate a new recovery key and save it securely before leaving the page."
      />

      <div style={{ maxWidth: 640 }}>
        <Card
          title="Regenerate Recovery Key"
          subtitle="The old key will be immediately invalidated when a new one is generated."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{
                background: 'var(--color-danger-bg, #FDEEEE)',
                color: 'var(--color-danger, #C64040)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-danger-border, #F7CACA)',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {newKey && (
              <div>
                <RecoveryKeyBox recoveryKey={newKey} />
              </div>
            )}

            <Button
              onClick={handleRegenerate}
              disabled={loading}
              loading={loading}
              fullWidth
            >
              <KeyRound size={16} />
              <span>{loading ? 'Generating...' : 'Generate New Recovery Key'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RecoveryKey;