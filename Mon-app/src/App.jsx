import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './contexts/authStore';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StockPage from './pages/StockPage';
import POSPage from './pages/POSPage';

// Code-split the lighter-traffic / heavier pages (Analytics pulls in Recharts)
// so their weight is only downloaded when a user actually visits them.
const OrdersPage      = lazy(() => import('./pages/OrdersPage'));
const SuppliersPage   = lazy(() => import('./pages/SuppliersPage'));
const ClientsPage     = lazy(() => import('./pages/ClientsPage'));
const PrescriptionsPage = lazy(() => import('./pages/PrescriptionsPage'));
const InvoicesPage    = lazy(() => import('./pages/InvoicesPage'));
const AnalyticsPage   = lazy(() => import('./pages/AnalyticsPage'));
const AlertsPage      = lazy(() => import('./pages/AlertsPage'));
const UsersPage       = lazy(() => import('./pages/UsersPage'));
const FinancePage     = lazy(() => import('./pages/FinancePage'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const ArchivePage     = lazy(() => import('./pages/ArchivePage'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-64 text-slate-600 text-sm">Chargement...</div>
);

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

const AdminRoute = ({ children }) => {
  const isAdmin = useAuthStore(s => s.isAdmin());
  return isAdmin ? children : <Navigate to="/" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const isSuperAdmin = useAuthStore(s => s.isSuperAdmin());
  return isSuperAdmin ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="stock"         element={<StockPage />} />
            <Route path="pos"           element={<POSPage />} />
            <Route path="orders"        element={<AdminRoute><OrdersPage /></AdminRoute>} />
            <Route path="suppliers"     element={<AdminRoute><SuppliersPage /></AdminRoute>} />
            <Route path="clients"       element={<ClientsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="invoices"      element={<InvoicesPage />} />
            <Route path="analytics"     element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
            <Route path="alerts"        element={<AdminRoute><AlertsPage /></AdminRoute>} />
            <Route path="users"         element={<AdminRoute><UsersPage /></AdminRoute>} />
            <Route path="finance"       element={<AdminRoute><FinancePage /></AdminRoute>} />
            <Route path="settings"      element={<AdminRoute><SettingsPage /></AdminRoute>} />
            <Route path="archive"       element={<SuperAdminRoute><ArchivePage /></SuperAdminRoute>} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
