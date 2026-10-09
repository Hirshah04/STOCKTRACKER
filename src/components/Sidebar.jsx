import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  PlusCircle,
  TrendingDown,
  AlertOctagon,
  ClipboardList,
  Store,
  LogOut,
  X
} from 'lucide-react';

export function Sidebar({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile
}) {
  const { user, shopInfo, dbMode, isOwner, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'staff']
    },
    {
      id: 'products',
      label: 'Products Master',
      icon: Boxes,
      roles: ['owner']
    },
    {
      id: 'inventory',
      label: 'Stock Catalog',
      icon: Layers,
      roles: ['owner', 'staff']
    },
    {
      id: 'add-stock',
      label: 'Add Stock',
      icon: PlusCircle,
      roles: ['owner']
    },
    {
      id: 'sell-stock',
      label: 'Sell Stock',
      icon: TrendingDown,
      roles: ['owner', 'staff']
    },
    {
      id: 'defective-stock',
      label: 'Defective Stock',
      icon: AlertOctagon,
      roles: ['owner', 'staff']
    },
    {
      id: 'transactions',
      label: 'Activity Logs',
      icon: ClipboardList,
      roles: ['owner', 'staff']
    },
    {
      id: 'profile',
      label: 'Shop Settings',
      icon: Store,
      roles: ['owner']
    }
  ];

  const handleNavClick = (tabId) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const shopName = shopInfo?.name || 'Stock Tracker';
  const shopEmail = shopInfo?.email || 'Shop Inventory';

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-icon">
            <Layers size={22} />
          </div>
          <div className="brand-info">
            <span className="brand-title" title={shopName}>{shopName}</span>
            <span className="brand-subtitle" title={shopEmail}>{shopEmail}</span>
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="btn-icon"
              style={{ marginLeft: 'auto', border: 'none' }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {(user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-meta">
            <span className="user-username">{user?.username || 'User'}</span>
            <span className="user-role-badge">
              {user?.role === 'owner' ? '👑 Shop Owner' : '👤 Staff Account'}
            </span>
          </div>
        </div>

        {/* Database Status Indicator */}
        <div className="sidebar-db-status">
          <span className={`status-dot ${dbMode === 'mongodb' ? 'connected' : 'local'}`} />
          <span>{dbMode === 'mongodb' ? 'Cloud MongoDB Active' : 'Local Fallback Active'}</span>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {navItems
            .filter(item => item.roles.includes(user?.role || 'staff'))
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  role="button"
                  tabIndex={0}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
              );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn-danger-outline btn-block"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
