import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const API_URL = 'http://127.0.0.1:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    return access && refresh ? { access, refresh } : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tokens) {
      try {
        const base64Url = tokens.access.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        setUser({ username: decoded.username || 'User', id: decoded.user_id });
      } catch (e) {
        console.error('Error decoding token', e);
        logout();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [tokens]);

  const login = async (username, password) => {
    const response = await fetch(`${API_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to login');
    }
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setTokens({ access: data.access, refresh: data.refresh });
    return data;
  };

  const register = async (username, email, password) => {
    const response = await fetch(`${API_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      const firstError = Object.values(data)[0];
      const errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
      throw new Error(errorMsg || 'Failed to register');
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setTokens(null);
    setUser(null);
  };

  const refreshToken = async () => {
    if (!tokens?.refresh) {
      logout();
      return null;
    }
    try {
      const response = await fetch(`${API_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error('Refresh expired');
      }
      localStorage.setItem('access_token', data.access);
      const newTokens = { access: data.access, refresh: tokens.refresh };
      setTokens(newTokens);
      return data.access;
    } catch (err) {
      logout();
      return null;
    }
  };

  const fetchWithAuth = async (url, options = {}) => {
    let currentAccess = tokens?.access;
    if (!currentAccess) {
      logout();
      throw new Error('No authentication token');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${currentAccess}`,
      'Content-Type': options.body ? 'application/json' : undefined
    };

    // Filter out undefined headers
    Object.keys(headers).forEach(key => {
      if (headers[key] === undefined) {
        delete headers[key];
      }
    });

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const newAccess = await refreshToken();
      if (newAccess) {
        headers['Authorization'] = `Bearer ${newAccess}`;
        response = await fetch(url, { ...options, headers });
      } else {
        throw new Error('Session expired');
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, tokens, loading, login, register, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
