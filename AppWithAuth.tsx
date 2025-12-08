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
      {/* User Profile Header - Top Right Corner - Mobile Optimized */}
      <div className="fixed top-2 right-2 z-[100]">
        <button 
          onClick={logout} 
          title="Logout"
          className="user-profile-mobile"
        >
          <img src={user?.picture} alt={user?.name} className="user-avatar-mobile" />
          <span className="logout-text-mobile">Logout</span>
        </button>
      </div>
      
      <App />
    </>
  );
};

export default AppWithAuth;
