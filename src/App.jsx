import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';

// Styles
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/forms.css';
import './styles/tables.css';
import './styles/responsive.css';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingIndicator from './components/LoadingIndicator';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import AddStock from './pages/AddStock';
import SellStock from './pages/SellStock';
import DefectiveStock from './pages/DefectiveStock';
import StockCategory from './pages/StockCategory';
import ActivityLog from './pages/ActivityLog';
import Profile from './pages/Profile';

function MainApp() {
  const { user, loading, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preselection parameters passed between views
  const [sellPreselectedId, setSellPreselectedId] = useState(null);
  const [defectivePreselectedId, setDefectivePreselectedId] = useState(null);

  if (loading) {
    return <LoadingIndicator fullPage text="Initializing Stock Tracker..." />;
  }

  if (!user) {
    return <Login />;
  }

  // Handle cross-navigation with preselected items
  const handleTriggerSell = (productId) => {
    setSellPreselectedId(productId);
    setActiveTab('sell-stock');
  };

  const handleTriggerDefective = (stockId) => {
    setDefectivePreselectedId(stockId);
    setActiveTab('defective-stock');
  };

  const handleTabChange = (tabId) => {
    // Reset temporary preselection states when navigating normally
    if (tabId !== 'sell-stock') setSellPreselectedId(null);
    if (tabId !== 'defective-stock') setDefectivePreselectedId(null);

    // Enforce role restrictions
    if (!isOwner && ['products', 'add-stock', 'profile'].includes(tabId)) {
      setActiveTab('dashboard');
      return;
    }

    setActiveTab(tabId);
  };

  // Map active tab to display title
  const tabTitles = {
    'dashboard': 'Dashboard Overview',
    'products': 'Master Products Catalog',
    'inventory': 'Stock Catalog & Inventory',
    'add-stock': 'Add Stock & Deliveries',
    'sell-stock': 'Sell Stock & Counter Sales',
    'defective-stock': 'Defective & Damaged Goods',
    'transactions': 'Activity Logs & Audit Trail',
    'profile': 'Shop Settings & Staff'
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="main-wrapper">
        <Navbar
          activeTabTitle={tabTitles[activeTab] || 'Dashboard'}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && (
            <Dashboard onNavigate={handleTabChange} />
          )}

          {activeTab === 'products' && isOwner && (
            <AddProduct />
          )}

          {activeTab === 'inventory' && (
            <StockCategory
              onNavigate={handleTabChange}
              onTriggerSell={handleTriggerSell}
              onTriggerDefective={handleTriggerDefective}
            />
          )}

          {activeTab === 'add-stock' && isOwner && (
            <AddStock onNavigate={handleTabChange} />
          )}

          {activeTab === 'sell-stock' && (
            <SellStock
              onNavigate={handleTabChange}
              preselectedProductId={sellPreselectedId}
            />
          )}

          {activeTab === 'defective-stock' && (
            <DefectiveStock
              onNavigate={handleTabChange}
              preselectedStockId={defectivePreselectedId}
            />
          )}

          {activeTab === 'transactions' && (
            <ActivityLog />
          )}

          {activeTab === 'profile' && isOwner && (
            <Profile />
          )}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
