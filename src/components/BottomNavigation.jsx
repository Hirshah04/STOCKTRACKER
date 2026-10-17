import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Layers,
  TrendingDown,
  ClipboardList,
  Store,
  AlertOctagon
} from 'lucide-react';
import './BottomNavigation.css';

/**
 * Mobile-only bottom navigation bar.
 * Shown only on screens ≤768px via CSS.
 * Fixed 5 items:
 *   - Dashboard, Stock Catalog, Sell Stock, Activity Logs, Profile (owner)
 *   - Dashboard, Stock Catalog, Sell Stock, Activity Logs, Defective Stock (staff)
 */
export function BottomNavigation({ activeTab, onSelectTab }) {
  const { isOwner } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Layers
    },
    {
      id: 'sell-stock',
      label: 'Sell',
      icon: TrendingDown
    },
    {
      id: 'transactions',
      label: 'Activity',
      icon: ClipboardList
    },
    isOwner
      ? { id: 'profile', label: 'Profile', icon: Store }
      : { id: 'defective-stock', label: 'Defective', icon: AlertOctagon }
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={() => onSelectTab(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} className="bottom-nav-icon" />
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNavigation;
