/**
 * ==============================================================================
 * AUTHENTICATION PAGE (LOGIN & SHOP REGISTRATION)
 * ==============================================================================
 * Serves as the primary gateway to the application:
 *  - Handles user sign-in via Email/Username and Password with JWT issuance.
 *  - Supports single active session enforcement (revoking older device logins).
 *  - Allows new shop owners to register their shop and owner credentials.
 *  - Provides navigation link to ForgotPassword flow.
 * ==============================================================================
 */
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Layers, Mail, Lock, Store, Phone, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import ForgotPassword from './ForgotPassword';
import './Login.css';

export function Login() {
  const { login, register, authNotice, clearAuthNotice } = useAuth();
  const { showToast } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lifecycle debug logging
  React.useEffect(() => {
    console.log('[Login] Authentication page mounted. Mode:', isRegistering ? 'Register' : 'Login');
  }, []);

  React.useEffect(() => {
    console.log('[Login] Mode toggled. Registering:', isRegistering, 'ForgotPassword:', isForgotPassword);
  }, [isRegistering, isForgotPassword]);

  // Login form state (Email ID & Password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    console.log('[Login] Attempting sign-in for email/username:', cleanEmail);

    if (!cleanEmail || !password) {
      showToast('Please enter both your Email ID and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Calling authService login...');
      await login(cleanEmail, password);
      console.log('[Login] Signed in successfully!');
      showToast('Signed in successfully!', 'success');
    } catch (err) {
      console.error('[Login] Sign-in failed:', err);
      showToast(err.message || 'Invalid email or password.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Handle Shop Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = registerEmail.trim().toLowerCase();
    console.log('[Login] Registering new shop:', { shopName: shopName.trim(), email: cleanEmail, phone: phone.trim() });

    if (!shopName.trim() || !phone.trim() || !cleanEmail || !ownerPassword) {
      showToast('All registration fields are required.', 'warning');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (ownerPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Calling authService register...');
      await register({
        shopName: shopName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        ownerName: ownerName.trim() || 'Shop Owner',
        ownerPassword
      });
      console.log('[Login] Shop registration completed successfully!');
      showToast('Shop and owner account registered successfully!', 'success');
    } catch (err) {
      console.error('[Login] Shop registration failed:', err);
      showToast(err.message || 'Registration failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // If user clicked "Forgot Password?", render the ForgotPassword screen
  if (isForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setIsForgotPassword(false)} />;
  }

  return (
    <div className="auth-page-container">
      <div className={`auth-card ${isRegistering ? 'auth-card-wide' : ''}`}>
        <div className="auth-header">
          <div className="auth-logo">
            <Layers size={28} />
          </div>
          <h1>{isRegistering ? 'Register Your Shop' : 'Stock Tracker'}</h1>
          <p>
            {isRegistering
              ? 'Set up your shop details to begin tracking inventory.'
              : 'Sign in to access your shop inventory management system'}
          </p>
        </div>

        {/* Revocation / Notice Banner */}
        {authNotice && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
              color: '#92400e',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} color="#d97706" />
              <span>{authNotice}</span>
            </div>
            <button
              type="button"
              onClick={clearAuthNotice}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {!isRegistering ? (
          /* Sign In Form with Email ID and Forgot Password */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Email ID</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@shop.com"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  className="auth-toggle-link"
                  style={{ fontSize: '0.8125rem', fontWeight: 500 }}
                  onClick={() => setIsForgotPassword(true)}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 12, height: 42 }}
              disabled={loading}
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>

            <div className="auth-toggle-box">
              New shop?
              <button
                type="button"
                className="auth-toggle-link"
                onClick={() => {
                  clearAuthNotice();
                  setIsRegistering(true);
                }}
              >
                Register Shop
              </button>
            </div>
          </form>
        ) : (
          /* Register Shop Form */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Shop Name*</label>
              <div className="input-with-icon">
                <Store size={18} />
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Metro Supermarket"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Number*</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address*</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="e.g. info@shop.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Owner Full Name*</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password*</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 8, height: 42 }}
              disabled={loading}
            >
              <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
              <CheckCircle2 size={16} />
            </button>

            <div className="auth-toggle-box">
              Already registered?
              <button
                type="button"
                className="auth-toggle-link"
                onClick={() => {
                  clearAuthNotice();
                  setIsRegistering(false);
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
