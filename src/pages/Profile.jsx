import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingIndicator from '../components/LoadingIndicator';
import { Store, UserPlus, Users, Trash2, Check, Shield } from 'lucide-react';
import './Profile.css';

export function Profile() {
  const { user, shopInfo, updateShopInfoState, isOwner } = useAuth();
  const { showToast } = useToast();

  // Shop Details State
  const [shopName, setShopName] = useState(shopInfo?.name || '');
  const [shopPhone, setShopPhone] = useState(shopInfo?.phone || '');
  const [shopEmail, setShopEmail] = useState(shopInfo?.email || '');
  const [savingShop, setSavingShop] = useState(false);

  // Staff State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Delete Staff Modal
  const [deleteStaffUsername, setDeleteStaffUsername] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(false);

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
      console.warn('Could not load users:', err);
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
        email: shopEmail.trim()
      });
      updateShopInfoState(res.data);
      showToast('Shop profile updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update shop: ' + err.message, 'danger');
    } finally {
      setSavingShop(false);
    }
  };

  // Create Staff Account
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const u = newStaffUsername.trim().toLowerCase();
    const p = newStaffPassword;

    if (u.length < 3) {
      showToast('Username must be at least 3 characters.', 'warning');
      return;
    }

    setCreatingStaff(true);
    try {
      await authService.createUser({ username: u, password: p });
      showToast(`Staff account "${u}" created!`, 'success');
      setNewStaffUsername('');
      setNewStaffPassword('');
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to create staff account.', 'danger');
    } finally {
      setCreatingStaff(false);
    }
  };

  // Delete Staff
  const handleConfirmDeleteStaff = async () => {
    if (!deleteStaffUsername) return;
    setDeletingStaff(true);
    try {
      await authService.deleteUser(deleteStaffUsername);
      showToast(`Staff member "${deleteStaffUsername}" removed.`, 'info');
      setDeleteStaffUsername(null);
      await loadUsers();
    } catch (err) {
      showToast('Failed to remove staff: ' + err.message, 'danger');
    } finally {
      setDeletingStaff(false);
    }
  };

  const staffMembers = usersList.filter(u => u.role === 'staff');

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Settings & Team</h1>
          <p className="page-subtitle">
            Configure your shop profile and manage staff access permissions.
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

        {/* Staff Accounts Management (Owner Only) */}
        {isOwner && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="var(--primary)" />
                <span>Create Staff Account</span>
              </h3>
            </div>

            <form onSubmit={handleCreateStaff} style={{ marginBottom: 28 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Staff Username*</label>
                  <input
                    type="text"
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="e.g. cashier_john"
                    required
                    className="form-control"
                  />
                  <span className="form-help">Unique username (min 3 chars).</span>
                </div>

                <div className="form-group">
                  <label>Password*</label>
                  <input
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-outline"
                disabled={creatingStaff}
                style={{ width: '100%', marginTop: 8 }}
              >
                <UserPlus size={16} />
                <span>{creatingStaff ? 'Creating Account...' : 'Create Staff Member'}</span>
              </button>
            </form>

            {/* Active Staff List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Active Staff Members ({staffMembers.length})
                </h4>
              </div>

              {loadingUsers ? (
                <LoadingIndicator text="Loading staff accounts..." />
              ) : staffMembers.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Users size={32} color="var(--text-muted)" style={{ opacity: 0.7 }} />
                  <p>No staff accounts registered yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {staffMembers.map(staff => (
                    <div
                      key={staff.username}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} color="var(--primary)" />
                        <strong style={{ fontSize: '0.875rem' }}>{staff.username}</strong>
                        <span className="badge badge-indigo">Staff</span>
                      </div>

                      <button
                        type="button"
                        className="btn-table-action text-danger"
                        title="Remove Account"
                        onClick={() => setDeleteStaffUsername(staff.username)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Staff Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteStaffUsername)}
        title="Remove Staff Account"
        message={`Are you sure you want to remove access for staff member "@${deleteStaffUsername}"?`}
        confirmText="Remove Account"
        confirmVariant="danger"
        isLoading={deletingStaff}
        onConfirm={handleConfirmDeleteStaff}
        onClose={() => setDeleteStaffUsername(null)}
      />
    </div>
  );
}

export default Profile;
