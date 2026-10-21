import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { setDbStatusListener } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [shopInfo, setShopInfo] = useState(null);
  const [dbMode, setDbMode] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState(() => sessionStorage.getItem('stocktaker_auth_notice') || null);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Set up DB status listener & token expiration handler
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

    // Handle token expired & session revoked events
    const handleExpired = (e) => {
      const reason = e?.detail?.reason || sessionStorage.getItem('stocktaker_auth_notice');
      if (reason) {
        setAuthNotice(reason);
      }
      setUser(null);
      setToken(null);
      setShopInfo(null);
    };

    window.addEventListener('stocktaker_auth_expired', handleExpired);
    return () => window.removeEventListener('stocktaker_auth_expired', handleExpired);
  }, []);

  // Periodic and on-focus session validity check to detect revocation promptly
  useEffect(() => {
    if (!token || !user) return;

    const checkSessionValidity = async () => {
      if (!userRef.current) return;
      try {
        await authService.getMe();
      } catch (err) {
        // If 401 occurred, api.js automatically dispatches stocktaker_auth_expired
      }
    };

    // Check every 20 seconds
    const intervalId = setInterval(checkSessionValidity, 20000);

    // Also check immediately when browser tab regains focus
    const onFocus = () => {
      checkSessionValidity();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, user]);

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

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setAuthNotice(null);
    sessionStorage.removeItem('stocktaker_auth_notice');
    setUser(res.data.user);
    setToken(res.data.token);
    if (res.data.user?.shopId) {
      await fetchShopData(res.data.user.shopId);
    }
    return res;
  };

  const register = async (regData) => {
    const res = await authService.register(regData);
    setAuthNotice(null);
    sessionStorage.removeItem('stocktaker_auth_notice');
    setUser(res.data.user);
    setToken(res.data.token);
    if (res.data.user?.shopId) {
      await fetchShopData(res.data.user.shopId);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setAuthNotice(null);
    sessionStorage.removeItem('stocktaker_auth_notice');
    setUser(null);
    setToken(null);
    setShopInfo(null);
  };

  const clearAuthNotice = () => {
    setAuthNotice(null);
    sessionStorage.removeItem('stocktaker_auth_notice');
  };

  const updateUserState = (updatedUser, newToken) => {
    setUser(updatedUser);
    localStorage.setItem('stocktaker_session', JSON.stringify(updatedUser));
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('stocktaker_token', newToken);
    }
  };

  const updateShopInfoState = (updated) => {
    setShopInfo(updated);
  };

  const setupEmail = async (newEmail) => {
    const res = await authService.setupEmail(newEmail);
    if (res.data?.user) {
      setUser(res.data.user);
    }
    if (res.data?.token) {
      setToken(res.data.token);
    }
    return res;
  };

  const isOwner = user?.role === 'owner';
  const isPartner = user?.role === 'partner';
  const isStaff = user?.role === 'staff';
  const canManageStock = isOwner || isPartner;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        shopInfo,
        dbMode,
        loading,
        isOwner,
        isPartner,
        isStaff,
        canManageStock,
        authNotice,
        clearAuthNotice,
        login,
        register,
        setupEmail,
        logout,
        fetchShopData,
        updateShopInfoState,
        updateUserState
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
