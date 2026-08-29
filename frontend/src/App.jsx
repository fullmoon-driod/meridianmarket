import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import LandingPage from './LandingPage';
import TradingDashboard from './TradingDashboard';

function App() {
  const hostname = window.location.hostname;
  const isCrmSubdomain = hostname === 'crm.meridianmarket.net' || hostname.startsWith('crm.');

  // Track the current URL path (e.g., '/', '/dashboard')
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Fallback interval to catch manual URL changes without full page reloads
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 200);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(interval);
    };
  }, [currentPath]);

  // 1. CRM Subdomain Route
  if (isCrmSubdomain) {
    return <AdminDashboard />;
  }

  // 2. Dashboard Route (triggers when URL contains /dashboard)
  if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard')) {
    return <TradingDashboard />;
  }

  // 3. Default Route: Main Landing Page
  return <LandingPage />;
}

export default App;