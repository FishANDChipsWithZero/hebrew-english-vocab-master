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
      {/* User Profile Header - Top Right Corner */}
      <div className="fixed top-4 right-4 z-50">
        <div className="user-profile" onClick={logout} title="Click to logout">
          <img src={user?.picture} alt={user?.name} className="user-avatar" />
          <span className="user-name">{user?.name}</span>
          <button className="logout-btn">
            Logout
          </button>
        </div>
      </div>
      
      <App />
    </>
  );
};

export default AppWithAuth;
