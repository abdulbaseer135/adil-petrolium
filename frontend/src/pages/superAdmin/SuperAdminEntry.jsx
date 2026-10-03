import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getSuperAdminSetupStatusApi } from '../../api/authApi';

export default function SuperAdminEntry() {
  const { user, loading, initialized } = useSelector((s) => s.auth);
  const [setupRequired, setSetupRequired] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // If user is already authenticated, no need to check setup status
    if (initialized && user) {
      setStatusLoading(false);
      return;
    }

    let isMounted = true;
    const checkSetupStatus = async () => {
      try {
        setStatusLoading(true);
        const res = await getSuperAdminSetupStatusApi();
        if (isMounted) {
          setSetupRequired(res.data?.data?.setupRequired ?? false);
        }
      } catch {
        if (isMounted) {
          // Default to login if status check fails
          setSetupRequired(false);
        }
      } finally {
        if (isMounted) {
          setStatusLoading(false);
        }
      }
    };

    if (initialized && !user) {
      checkSetupStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [initialized, user]);

  if (loading || !initialized || statusLoading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg)',
        }}
      >
        <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Checking Super Admin status...
        </div>
      </div>
    );
  }

  // 1. Authenticated Routing
  if (user) {
    if (user.role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'customer') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // 2. Unauthenticated Routing based on setup status
  if (setupRequired === true) {
    return <Navigate to="/super-admin/setup" replace />;
  }

  return <Navigate to="/super-admin/login" replace />;
}
