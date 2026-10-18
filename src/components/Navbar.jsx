import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Menu, LogOut, User } from 'lucide-react';
import './Navbar.css';


export function Navbar({
  activeTabTitle = 'Dashboard',
  onOpenMobileMenu,
  onNavigateProfile
}) {
  const { user, logout } = useAuth();

  const canNavigateProfile = typeof onNavigateProfile === 'function';

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
        {/* User Pill — clickable for owners, static for staff */}
        <div
          className={`navbar-user-pill${canNavigateProfile ? ' clickable' : ''}`}
          onClick={canNavigateProfile ? onNavigateProfile : undefined}
          role={canNavigateProfile ? 'button' : undefined}
          tabIndex={canNavigateProfile ? 0 : undefined}
          onKeyDown={canNavigateProfile ? (e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateProfile(); } : undefined}
          title={canNavigateProfile ? 'Go to Profile' : (user?.name || user?.email || user?.username)}
          aria-label={canNavigateProfile ? 'Open Profile page' : undefined}
        >
          <User size={14} color="var(--primary)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.name || user?.email || user?.username}
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
