import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearToken, getToken, setToken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [booting, setBooting] = useState(Boolean(getToken()));

  const signOut = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      await api.post('/auth/logout').catch(() => {});
    }
    clearToken();
    disconnectSocket();
    setTokenState('');
    setUser(null);
  }, []);

  const applySession = useCallback((session) => {
    setToken(session.token);
    setTokenState(session.token);
    setUser(session.user);
    connectSocket(session.token);
  }, []);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return undefined;
    }

    connectSocket(token);
    let active = true;

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.data.user);
      })
      .catch(() => {
        if (active) signOut({ silent: true });
      })
      .finally(() => {
        if (active) setBooting(false);
      });

    return () => {
      active = false;
    };
  }, [token, signOut]);

  useEffect(() => {
    const onExpired = () => {
      clearToken();
      disconnectSocket();
      setTokenState('');
      setUser(null);
    };
    window.addEventListener('chatly:auth-expired', onExpired);
    return () => window.removeEventListener('chatly:auth-expired', onExpired);
  }, []);

  const login = useCallback(
    async (identifier, password) => {
      const { data } = await api.post('/auth/login', { identifier, password });
      applySession(data.data);
      return data.data.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/register', payload);
      applySession(data.data);
      return data.data.user;
    },
    [applySession]
  );

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({ user, token, booting, login, register, signOut, updateUser, setUser }),
    [user, token, booting, login, register, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
