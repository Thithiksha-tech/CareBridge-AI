import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: string, assignedPatientId?: number, hospitalName?: string) => Promise<{ user: User; otpPreview?: string }>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('carebridge_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('carebridge_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      const savedToken = localStorage.getItem('carebridge_token');
      if (savedToken) {
        try {
          const data = await authService.me();
          setUser(data.user);
          localStorage.setItem('carebridge_user', JSON.stringify(data.user));
        } catch {
          localStorage.removeItem('carebridge_token');
          localStorage.removeItem('carebridge_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('carebridge_token', data.token);
    localStorage.setItem('carebridge_user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (name: string, email: string, password: string, role = 'patient', assignedPatientId?: number, hospitalName?: string) => {
    const data = await authService.register(name, email, password, role, assignedPatientId, hospitalName);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('carebridge_token', data.token);
    localStorage.setItem('carebridge_user', JSON.stringify(data.user));
    return data;
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem('carebridge_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('carebridge_token');
    localStorage.removeItem('carebridge_user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
