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

    // Log login to Google Sheets
    try {
      fetch('https://script.google.com/macros/s/AKfycbyHhT6iwgsc9fymUUDhQMM0Ct0r5gtbU3IIXdbOHnwNHIoweekrc3rwRzFJHfoXqNlh/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, email: user.email })
      });
    } catch (e) {
      console.log('Login log failed:', e);
    }
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
