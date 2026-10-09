import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Menu, LogOut, Database, User } from 'lucide-react';

export function Navbar({
  activeTabTitle = 'Dashboard',
  onOpenMobileMenu
}) {
  const { user, dbMode, logout } = useAuth();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          {activeTabTitle}
        </h2>
      </div>

      <div className="navbar-right">
        {/* DB Status Badge */}
        <div
          className="badge badge-neutral"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}
          title={dbMode === 'mongodb' ? 'Connected to MongoDB Atlas' : 'Running on local file storage'}
        >
          <Database size={13} color={dbMode === 'mongodb' ? 'var(--success)' : 'var(--warning)'} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {dbMode === 'mongodb' ? 'MongoDB Atlas' : 'Local Storage'}
          </span>
        </div>

        {/* User Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)'
          }}
        >
          <User size={14} color="var(--primary)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.username}
          </span>
        </div>

        {/* Logout Quick Button */}
        <button
          type="button"
          onClick={logout}
          className="btn-icon"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
