import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation'
import PosPage from './pages/PosPage'
import ProductsPage from './pages/ProductsPage'
import CustomersPage from './pages/CustomersPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import './App.css'

function AppContent() {
  const location = useLocation();
  const hideNav = location.pathname === '/pos' || location.pathname === '/login';

  return (
    <>
      {/* Chỉ hiển thị Navigation khi không phải POS/Login */}
      {!hideNav && <Navigation />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Trang POS bán hàng */}
        <Route
          path="/pos"
          element={(
            <RequireAuth>
              <PosPage />
            </RequireAuth>
          )}
        />
        
        {/* Trang quản lý sản phẩm */}
        <Route
          path="/products"
          element={(
            <RequireAuth>
              <ProductsPage />
            </RequireAuth>
          )}
        />
        
        {/* Trang quản lý khách hàng */}
        <Route
          path="/customers"
          element={(
            <RequireAuth>
              <CustomersPage />
            </RequireAuth>
          )}
        />
        
        {/* Trang báo cáo */}
        <Route
          path="/reports"
          element={(
            <RequireAuth>
              <ReportsPage />
            </RequireAuth>
          )}
        />
        
        {/* Trang cài đặt */}
        <Route
          path="/settings"
          element={(
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          )}
        />
        
        {/* Mặc định redirect về POS */}
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
