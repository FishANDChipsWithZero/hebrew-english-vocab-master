import React from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import App from './App';

const AppWithAuth: React.FC = () => {
  const { isAuthenticated, login, logout, user } = useAuth();

  if (!isAuthenticated) {
    return <Login onLoginSuccess={login} />;
  }

  return (
    <>
      {/* Top Navigation Bar - Right Corner */}
      <div className="fixed top-2 right-2 z-[100] flex items-center gap-2">
        {/* Logout Button - X icon */}
        <button
          type="button"
          onClick={logout}
          title="Logout"
          className="nav-btn-top"
        >
          <span className="text-lg font-bold">✕</span>
        </button>
      </div>

      <App />
    </>
  );
};

export default AppWithAuth;
