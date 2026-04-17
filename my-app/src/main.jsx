import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx' 
import AdminDashboard from './AdminDashboard.jsx'
import Analytics from './Analytics';
import AdminLayout from './AdminLayout.jsx'
import './index.css'
import SuperAdminDashboard from './SuperAdminDashboard';
import SuperAdminLogin from './SuperAdminLogin'; // Ya jo bhi aapka path ho


// Temporary Pages (Placeholder) taaki blank screen na aaye
import LiveOrders from './LiveOrders';
// main.jsx
import MenuManagement from './MenuManagement'; // Asli file import ki

// Routes ke andar ye line update karein:
<Route path="/admin/menu" element={<MenuManagement />} />

import Settings from './Settings';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Customer Menu */}
        <Route path="/" element={<App />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<App />} />
        <Route path="/admin-login" element={<App />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/admin/orders" element={<LiveOrders />} />
        <Route path="/admin/menu" element={<MenuManagement />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)