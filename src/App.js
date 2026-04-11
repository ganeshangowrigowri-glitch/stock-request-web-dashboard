import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequestsPage from './pages/RequestsPage';
import RequestDetailPage from './pages/RequestDetailPage';
import SalesSummaryPage from './pages/SalesSummaryPage';
import BrandManagementPage from './pages/BrandManagementPage';
import ShopManagementPage from './pages/ShopManagementPage'; 
import ApprovedSummaryPage from './pages/ApprovedSummaryPage';
import NotificationsPage from './pages/NotificationsPage';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/requests" element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
        <Route path="/requests/:id" element={<PrivateRoute><RequestDetailPage /></PrivateRoute>} />
        <Route path="/sales-summary" element={<PrivateRoute><SalesSummaryPage /></PrivateRoute>} />
        <Route path="/brands" element={<PrivateRoute><BrandManagementPage /></PrivateRoute>} />
        {/* Updated Shop Management Route */}
        <Route path="/shops" element={<PrivateRoute><ShopManagementPage /></PrivateRoute>} />
        <Route path="/approved-summary" element={<ApprovedSummaryPage />} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
