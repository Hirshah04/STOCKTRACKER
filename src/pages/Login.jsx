import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Layers, User, Lock, Store, Phone, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import './Login.css';

export function Login() {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Please enter both username and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
      showToast(`Welcome back, ${username.toUpperCase()}!`, 'success');
    } catch (err) {
      showToast(err.message || 'Invalid username or password.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim() || !email.trim() || !ownerUsername.trim() || !ownerPassword) {
      showToast('All registration fields are required.', 'warning');
      return;
    }

    if (ownerUsername.trim().length < 3) {
      showToast('Owner username must be at least 3 characters.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await register({
        shopName: shopName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ownerUsername: ownerUsername.trim().toLowerCase(),
        ownerPassword
      });
      showToast('Shop registered successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

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

        {!isRegistering ? (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. owner or staff"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
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
              style={{ marginTop: 8, height: 42 }}
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
                onClick={() => setIsRegistering(true)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. info@shop.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Owner Username*</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    value={ownerUsername}
                    onChange={(e) => setOwnerUsername(e.target.value)}
                    placeholder="e.g. owner"
                    required
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Owner Password*</label>
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
                onClick={() => setIsRegistering(false)}
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
