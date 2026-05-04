import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx' 
import AdminDashboard from './AdminDashboard.jsx'
import Analytics from './Analytics';
import AdminLayout from './AdminLayout.jsx'
import './index.css'
import SuperAdminDashboard from './SuperAdminDashboard';
import SuperAdminLogin from './SuperAdminLogin';
import LiveOrders from './LiveOrders';
import MenuManagement from './MenuManagement'; 
import Settings from './Settings';
import AdminLoginWrapper from './AdminLoginWrapper.jsx'; // Naya wrapper banayenge error avoid karne ke liye

// Wrapper component to provide AdminLogin without layout crash
const AdminLoginRoute = () => {
  const handleLoginSuccess = (u) => {
    window.location.href = '/admin';
  };
  return <AdminLoginWrapper onLoginSuccess={handleLoginSuccess} />;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Customer Menu */}
        <Route path="/" element={<App />} />
        
        {/* Admin Login (Completely Isolated from App.jsx) */}
        <Route path="/admin-login" element={<AdminLoginRoute />} />
        
        {/* Super Admin */}
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        
        {/* Secure Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/orders" element={<LiveOrders />} />
        <Route path="/admin/menu" element={<MenuManagement />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)