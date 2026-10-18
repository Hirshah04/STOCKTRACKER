import React, { useState } from 'react';
import { Mail, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function EmailSetupModal() {
  const { user, setupEmail } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Show if user is logged in and has no email address or needsEmailSetup flag
  const needsEmail = user && (!user.email || user.needsEmailSetup) && !dismissed;

  if (!needsEmail) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g., owner@store.com).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setupEmail(cleanEmail);
      showToast('Email address linked successfully! You can now log in using this email.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update email address. It may already be in use.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div
        className="modal-container"
        style={{ maxWidth: 480, margin: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-setup-title"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 id="email-setup-title" style={{ margin: 0, fontSize: '1.125rem' }}>Link Email Address</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Required for password recovery and modern email sign-in
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              gap: 10,
              fontSize: '0.875rem',
              color: 'var(--text-primary)'
            }}>
              <ShieldAlert size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Account Update:</strong> Your account (<strong>{user?.name || user?.userId}</strong>) is currently using legacy credentials. Please provide your email address to enable secure OTP password resets and direct email login.
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                color: 'var(--danger)',
                fontSize: '0.875rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="setup-email-input" className="form-label">
                Email Address <span className="required-star">*</span>
              </label>
              <input
                id="setup-email-input"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
                autoFocus
              />
              <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Each account must have a unique email address.
              </span>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDismissed(true)}
              disabled={loading}
            >
              Remind Me Later
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !email.trim()}
            >
              {loading ? 'Saving...' : 'Save & Link Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
