import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { setDbStatusListener } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [shopInfo, setShopInfo] = useState(null);
  const [dbMode, setDbMode] = useState('connecting');
  const [loading, setLoading] = useState(true);

  // Set up DB status listener
  useEffect(() => {
    setDbStatusListener((mode) => {
      setDbMode(mode);
    });

    // Check system status initially
    authService.getStatus()
      .then(res => {
        setDbMode(res.data?.dbConnected ? 'mongodb' : 'local_fallback');
      })
      .catch(() => {
        setDbMode('local_fallback');
      });

    // Handle token expired events
    const handleExpired = () => {
      setUser(null);
      setToken(null);
      setShopInfo(null);
    };
    window.addEventListener('stocktaker_auth_expired', handleExpired);
    return () => window.removeEventListener('stocktaker_auth_expired', handleExpired);
  }, []);

  // Fetch shop data when user changes
  const fetchShopData = useCallback(async (targetShopId) => {
    if (!targetShopId) return;
    try {
      const res = await authService.getShop(targetShopId);
      setShopInfo(res.data);
    } catch (err) {
      console.warn("Could not load shop info:", err);
      setShopInfo({ id: targetShopId, name: "My Shop", phone: "", email: "" });
    }
  }, []);

  useEffect(() => {
    if (user && user.shopId) {
      fetchShopData(user.shopId).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchShopData]);

  const login = async (username, password) => {
    const res = await authService.login(username, password);
    setUser(res.data.user);
    setToken(res.data.token);
    if (res.data.user?.shopId) {
      await fetchShopData(res.data.user.shopId);
    }
    return res;
  };

  const register = async (regData) => {
    const res = await authService.register(regData);
    setUser(res.data.user);
    setToken(res.data.token);
    if (res.data.user?.shopId) {
      await fetchShopData(res.data.user.shopId);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setShopInfo(null);
  };

  const updateShopInfoState = (updated) => {
    setShopInfo(updated);
  };

  const isOwner = user?.role === 'owner';
  const isStaff = user?.role === 'staff';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        shopInfo,
        dbMode,
        loading,
        isOwner,
        isStaff,
        login,
        register,
        logout,
        fetchShopData,
        updateShopInfoState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
