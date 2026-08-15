import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import TradingDashboard from './TradingDashboard';
import AdminPortal from './AdminPortal';

export default function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Client Trading Terminal */}
      <Route path="/dashboard" element={<TradingDashboard />} />

      {/* Separate Isolated Admin/CRM System */}
      <Route path="/admin" element={<AdminPortal />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}