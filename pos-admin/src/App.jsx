import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ReportsPage from './pages/ReportsPage';
import StoresPage from './pages/StoresPage';
import UsersPage from './pages/UsersPage';
import ProductsPage from './pages/ProductsPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderNewPage from './pages/PurchaseOrderNewPage';
import PurchaseReturnPage from './pages/PurchaseReturnPage';
import InvoicesPage from './pages/InvoicesPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/dashboard"
            element={(
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            )}
          />
          <Route
            path="/reports"
            element={(
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/products"
            element={(
              <RequireAuth>
                <ProductsPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/suppliers"
            element={(
              <RequireAuth>
                <SuppliersPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/purchase-orders"
            element={(
              <RequireAuth>
                <PurchaseOrdersPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/purchase-orders/new"
            element={(
              <RequireAuth>
                <PurchaseOrderNewPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/purchase-orders/:id/edit"
            element={(
              <RequireAuth>
                <PurchaseOrderNewPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/purchase-orders/:id/return"
            element={(
              <RequireAuth>
                <PurchaseReturnPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/invoices"
            element={(
              <RequireAuth>
                <InvoicesPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/stores"
            element={(
              <RequireAuth>
                <StoresPage />
              </RequireAuth>
            )}
          />
          <Route
            path="/users"
            element={(
              <RequireAuth>
                <UsersPage />
              </RequireAuth>
            )}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
