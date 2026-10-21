/**
 * ==============================================================================
 * FORGOT PASSWORD & OTP RECOVERY PAGE
 * ==============================================================================
 * Handles the secure 3-step account password recovery workflow:
 *  - Step 1 ('request_otp'): Validates email and dispatches 6-digit numeric OTP.
 *  - Step 2 ('verify_otp'): Verifies code validity, cooldown timer, and expiry.
 *  - Step 3 ('reset_password'): Issues single-use token to securely update password.
 * ==============================================================================
 */
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import './ForgotPassword.css';

export function ForgotPassword({ onBackToLogin }) {
  const { showToast } = useToast();

  // Step state: 'request_otp' | 'verify_otp' | 'reset_password' | 'success'
  useEffect(() => {
    console.log('[ForgotPassword] Page mounted. Initial step:', step);
  }, []);

  useEffect(() => {
    console.log('[ForgotPassword] Active recovery step transitioned to:', step);
  }, [step]);
  const [step, setStep] = useState('request_otp');
  const [loading, setLoading] = useState(false);

  // Form inputs
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState(null);

  // Cooldown & Expiry timers
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300); // 5 minutes in seconds

  // Timer intervals
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer;
    if (step === 'verify_otp' && otpExpiresIn > 0) {
      timer = setInterval(() => {
        setOtpExpiresIn(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpExpiresIn]);

  // Format seconds as MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPasswordSendOtp(cleanEmail);
      showToast(res.message || 'If an account exists for this email, an OTP will be sent.', 'info');
      setStep('verify_otp');
      setResendCooldown(60); // 60 seconds cooldown
      setOtpExpiresIn(300); // 5 minutes validity
    } catch (err) {
      showToast(err.message || 'Failed to send OTP.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      showToast('Please enter the 6-digit numeric verification code.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPasswordVerifyOtp(email.trim().toLowerCase(), cleanOtp);
      showToast('Verification code confirmed!', 'success');
      setResetToken(res.data.resetToken);
      setStep('reset_password');
    } catch (err) {
      showToast(err.message || 'Invalid or expired verification code.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('Please fill in both password fields.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match. Please re-enter.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPasswordReset(resetToken, newPassword, confirmPassword);
      showToast(res.message || 'Password reset successfully!', 'success');
      setStep('success');
    } catch (err) {
      showToast(err.message || 'Failed to reset password. The session may have expired.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="forgot-card">
        {/* Step 1: Request OTP Screen */}
        {step === 'request_otp' && (
          <>
            <div className="forgot-header">
              <div className="auth-logo">
                <KeyRound size={28} />
              </div>
              <h1>Forgot Password</h1>
              <p>Enter the email address associated with your account to receive a 6-digit verification code.</p>
            </div>

            <form onSubmit={handleSendOtp}>
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
                    autoFocus
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
                <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="forgot-back-link"
                onClick={onBackToLogin}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </button>
            </form>
          </>
        )}

        {/* Step 2: Verify OTP Screen */}
        {step === 'verify_otp' && (
          <>
            <div className="forgot-header">
              <div className="auth-logo">
                <ShieldCheck size={28} />
              </div>
              <h1>Enter Verification Code</h1>
              <p>
                We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp}>
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: 6 }}>6-Digit Verification Code</label>
                <div className="otp-input-container">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="otp-digit-input"
                    autoFocus
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="otp-timer-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} />
                  <span className={otpExpiresIn < 60 ? 'timer-expiring' : ''}>
                    Expires in {formatTime(otpExpiresIn)}
                  </span>
                </div>

                <div>
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ height: 42 }}
                disabled={loading || otp.length !== 6 || otpExpiresIn === 0}
              >
                <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="forgot-back-link"
                onClick={() => setStep('request_otp')}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                <span>Change Email Address</span>
              </button>
            </form>
          </>
        )}

        {/* Step 3: Reset Password Screen (Contains ONLY New Password and Confirm Password) */}
        {step === 'reset_password' && (
          <>
            <div className="forgot-header">
              <div className="auth-logo">
                <Lock size={28} />
              </div>
              <h1>Set New Password</h1>
              <p>Create a strong password for your account.</p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
                <span className="form-help" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Minimum 6 characters.
                </span>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
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
                <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}

        {/* Step 4: Success Screen */}
        {step === 'success' && (
          <div className="reset-success-box">
            <div className="reset-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Password Reset Complete!
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              Your password has been securely updated. Any existing active sessions have been revoked. Please sign in with your new password.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={onBackToLogin}
              style={{ height: 42 }}
            >
              <span>Back to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
