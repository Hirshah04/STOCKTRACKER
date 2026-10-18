import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingIndicator from '../components/LoadingIndicator';
import { Store, UserPlus, Users, Trash2, Check, Shield, UserCheck, AlertCircle } from 'lucide-react';
import './Profile.css';

export function Profile() {
  const { user, shopInfo, updateShopInfoState, isOwner } = useAuth();
  const { showToast } = useToast();

  // Shop Details State
  const [shopName, setShopName] = useState(shopInfo?.name || '');
  const [shopPhone, setShopPhone] = useState(shopInfo?.phone || '');
  const [shopEmail, setShopEmail] = useState(shopInfo?.email || '');
  const [savingShop, setSavingShop] = useState(false);

  // Team Account Creation State (Partner & Staff)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [accountType, setAccountType] = useState('partner'); // 'partner' or 'staff'
  const [fullName, setFullName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Delete User Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name, email }
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (shopInfo) {
      setShopName(shopInfo.name || '');
      setShopPhone(shopInfo.phone || '');
      setShopEmail(shopInfo.email || '');
    }
  }, [shopInfo]);

  const loadUsers = async () => {
    if (!isOwner) return;
    try {
      setLoadingUsers(true);
      const res = await authService.getUsers();
      setUsersList(res.data || []);
    } catch (err) {
      console.warn('Could not load team accounts:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isOwner]);

  // Update Shop Profile
  const handleSaveShopProfile = async (e) => {
    e.preventDefault();
    if (!user || !user.shopId) return;

    setSavingShop(true);
    try {
      const res = await authService.updateShop(user.shopId, {
        name: shopName.trim(),
        phone: shopPhone.trim(),
        email: shopEmail.trim().toLowerCase()
      });
      updateShopInfoState(res.data);
      showToast('Shop profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update shop: ' + err.message, 'danger');
    } finally {
      setSavingShop(false);
    }
  };

  // Create Partner or Staff Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = accountEmail.trim().toLowerCase();
    const cleanPhone = contactNumber.trim();
    const cleanPassword = accountPassword;

    if (!cleanName) {
      showToast('Please enter the full name.', 'warning');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (!cleanPhone) {
      showToast('Please enter a contact number.', 'warning');
      return;
    }

    if (cleanPassword.length < 4) {
      showToast('Password must be at least 4 characters long.', 'warning');
      return;
    }

    setCreatingAccount(true);
    try {
      const res = await authService.createUser({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: accountType,
        password: cleanPassword
      });

      showToast(res.message || `${accountType === 'partner' ? 'Partner' : 'Staff'} account created successfully!`, 'success');
      setFullName('');
      setAccountEmail('');
      setContactNumber('');
      setAccountPassword('');
      await loadUsers();
    } catch (err) {
      showToast(err.message || `Failed to create ${accountType} account.`, 'danger');
    } finally {
      setCreatingAccount(false);
    }
  };

  // Confirm Delete Team Member
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    try {
      await authService.deleteUser(deleteTarget.id || deleteTarget.email);
      showToast(`Account "${deleteTarget.name || deleteTarget.email}" removed.`, 'info');
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      showToast('Failed to remove account: ' + err.message, 'danger');
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Settings & Team</h1>
          <p className="page-subtitle">
            Configure your shop profile and manage Partner & Staff accounts.
          </p>
        </div>
      </div>

      <div className="profile-grid-layout">
        {/* Shop Profile Form */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={20} color="var(--primary)" />
              <span>Shop Profile Information</span>
            </h3>
          </div>

          <form onSubmit={handleSaveShopProfile}>
            <div className="form-group">
              <label>Shop Name*</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Phone*</label>
                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Email Address*</label>
                <input
                  type="email"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingShop}
              >
                <Check size={16} />
                <span>{savingShop ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Team Accounts Management (Owner Only) */}
        {isOwner && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="var(--primary)" />
                <span>Create Team Account</span>
              </h3>
            </div>

            {/* Account Creation Form with Partner / Staff Dropdown */}
            <form onSubmit={handleCreateAccount} style={{ marginBottom: 28 }}>
              <div className="form-group">
                <label>Account Type*</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: 600 }}
                  disabled={creatingAccount}
                >
                  <option value="partner">Partner</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {/* Dynamic Guidance Banner */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  fontSize: '0.8125rem',
                  lineHeight: 1.4,
                  backgroundColor: accountType === 'partner' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                  border: `1px solid ${accountType === 'partner' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(2, 132, 199, 0.2)'}`,
                  color: accountType === 'partner' ? 'var(--primary)' : 'var(--text-primary)'
                }}
              >
                {accountType === 'partner' ? (
                  <span>
                    <strong>Partner:</strong> Full inventory access identical to the owner (Add Stock, Master Catalog, Defective, Sales, Logs). Cannot transfer shop ownership.
                  </span>
                ) : (
                  <span>
                    <strong>Staff:</strong> Can perform sales and log defective goods. Strictly restricted from adding new stock or creating products.
                  </span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name*</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Smith"
                    required
                    className="form-control"
                    disabled={creatingAccount}
                  />
                </div>

                <div className="form-group">
                  <label>Email ID*</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="e.g. alex@shop.com"
                    required
                    className="form-control"
                    disabled={creatingAccount}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Number*</label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    required
                    className="form-control"
                    disabled={creatingAccount}
                  />
                </div>

                <div className="form-group">
                  <label>Password*</label>
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-control"
                    disabled={creatingAccount}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-outline"
                disabled={creatingAccount}
                style={{ width: '100%', marginTop: 8 }}
              >
                <UserPlus size={16} />
                <span>{creatingAccount ? 'Creating Account...' : `Create ${accountType === 'partner' ? 'Partner' : 'Staff'} Account`}</span>
              </button>
            </form>

            {/* Active Team Accounts List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active Team Members ({usersList.length})
                </h4>
              </div>

              {loadingUsers ? (
                <LoadingIndicator text="Loading team accounts..." />
              ) : usersList.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Users size={32} color="var(--text-muted)" style={{ opacity: 0.7 }} />
                  <p>No team accounts registered yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {usersList.map(member => (
                    <div
                      key={member.id || member.email}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        {member.role === 'partner' ? (
                          <UserCheck size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                        ) : (
                          <Shield size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              {member.name || member.email}
                            </strong>
                            {member.role === 'partner' ? (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontWeight: 600,
                                  backgroundColor: '#e0e7ff',
                                  color: '#4338ca'
                                }}
                              >
                                Partner
                              </span>
                            ) : (
                              <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>
                                Staff
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span>{member.email}</span>
                            {member.phone && <span>• {member.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-table-action text-danger"
                        title="Remove Account"
                        onClick={() => setDeleteTarget({ id: member.id || member.userId, name: member.name, email: member.email })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Remove Team Account"
        message={`Are you sure you want to remove access for "${deleteTarget?.name || deleteTarget?.email}"? They will no longer be able to log in.`}
        confirmText="Remove Account"
        confirmVariant="danger"
        isLoading={deletingUser}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Profile;
