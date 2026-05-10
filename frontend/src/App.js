import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';

// Layouts
import AdminLayout from './pages/admin/AdminLayout';
import CustomerLayout from './pages/customer/CustomerLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';
import AdminLogin from './pages/auth/AdminLogin';
import AdminRecover from './pages/auth/AdminRecover';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import Customers from './pages/admin/Customers';
import CustomerCreate from './pages/admin/CustomerCreate';
import CustomerDetail from './pages/admin/CustomerDetail';
import FuelEntry from './pages/admin/FuelEntry';
import Transactions from './pages/admin/Transactions';
import DailyRecord from './pages/admin/DailyRecord';
import MonthlyReport from './pages/admin/MonthlyReport';
import YearlyReport from './pages/admin/YearlyReport';
import ExportCenter from './pages/admin/ExportCenter';
import AuditLogs from './pages/admin/AuditLogs';
import RecoveryKey from './pages/admin/RecoveryKey';
import AdminProfile from './pages/admin/AdminProfile';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import Statement from './pages/customer/Statement';
import MonthlySummary from './pages/customer/MonthlySummary';

import { Skeleton } from './components/ui/Skeleton';

const FullPageLoader = () => (
  <div style={{
    minHeight: '100dvh',
    background: 'var(--color-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-6)',
  }}>
    <div style={{
      width: '100%',
      maxWidth: 420,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <Skeleton height={14} width="32%" />
      <Skeleton height={42} />
      <Skeleton height={42} />
      <Skeleton height={42} width="48%" />
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading, initialized } = useSelector((s) => s.auth);

  if (loading || !initialized) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading, initialized } = useSelector((s) => s.auth);
  const location = useLocation();

  if (loading || !initialized) return <FullPageLoader />;
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace state={{ from: location }} />;
  }
  if (user?.role === 'customer') {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/recover" element={<AdminRecover />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerCreate />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="fuel-entry" element={<FuelEntry />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="daily-record" element={<DailyRecord />} />
        <Route path="monthly-report" element={<MonthlyReport />} />
        <Route path="yearly-report" element={<YearlyReport />} />
        <Route path="exports" element={<ExportCenter />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="recovery-key" element={<RecoveryKey />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="statement" element={<Statement />} />
        <Route path="monthly" element={<MonthlySummary />} />
      </Route>

      <Route
        path="/unauthorized"
        element={
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <h1>403 — Access Denied</h1>
            <p>You don't have permission to view this page.</p>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}