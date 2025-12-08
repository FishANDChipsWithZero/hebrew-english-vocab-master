import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleUser } from '../components/Login';

interface AuthContextType {
  user: GoogleUser | null;
  login: (user: GoogleUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);

  useEffect(() => {
    // Check for saved user in sessionStorage
    const savedUser = sessionStorage.getItem('authUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        sessionStorage.removeItem('authUser');
      }
    }
  }, []);

  const login = (user: GoogleUser) => {
    setUser(user);
    sessionStorage.setItem('authUser', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('authUser');
    // Clear other session data
    sessionStorage.clear();
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
