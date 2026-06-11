import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  tokenStorage,
  login as apiLogin,
  register as apiRegister,
  getMe,
  getConfig,
  updateMe as apiUpdateMe,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [appConfig, setAppConfig] = useState({ adsEnabled: false, premiumEnabled: false });
  const [loading, setLoading] = useState(true);

  // Bootstrap: restore session and fetch server config on app start
  useEffect(() => {
    async function init() {
      try {
        const [storedToken, config] = await Promise.all([
          tokenStorage.get(),
          getConfig().catch(() => ({ adsEnabled: false, premiumEnabled: false })),
        ]);

        setAppConfig(config);

        if (storedToken) {
          const { user: me } = await getMe();
          setUser(me);
        }
      } catch {
        await tokenStorage.delete();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await apiLogin(email, password);
    await tokenStorage.set(token);
    setUser(u);
    return u;
  };

  const register = async (email, password, displayName) => {
    const { token, user: u } = await apiRegister(email, password, displayName);
    await tokenStorage.set(token);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await tokenStorage.delete();
    setUser(null);
  };

  const updateUser = async (data) => {
    const { user: u } = await apiUpdateMe(data);
    setUser(u);
    return u;
  };

  /**
   * Ads are shown when:
   *  - Server flag adsEnabled is true, AND
   *  - User is not premium, AND
   *  - User has not opted out
   */
  const showAds =
    appConfig.adsEnabled && (!user || (!user.isPremium && !user.adOptOut));

  return (
    <AuthContext.Provider
      value={{ user, loading, appConfig, showAds, login, register, logout, updateUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
