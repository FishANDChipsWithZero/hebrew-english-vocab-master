import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface LoginProps {
  onLoginSuccess: (user: GoogleUser) => void;
}

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const handleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential);
      
      // Save user email and login timestamp to localStorage for analytics
      try {
        const userLeads = JSON.parse(localStorage.getItem('user_leads') || '[]');
        const existingUser = userLeads.find((u: any) => u.email === decoded.email);
        
        if (!existingUser) {
          userLeads.push({
            email: decoded.email,
            name: decoded.name,
            firstLogin: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } else {
          existingUser.lastLogin = new Date().toISOString();
        }
        
        localStorage.setItem('user_leads', JSON.stringify(userLeads));
      } catch (e) {
        console.error('Failed to save user lead:', e);
      }
      
      onLoginSuccess(decoded);
    }
  };

  const handleError = () => {
    console.error('Login Failed');
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.jpg" alt="Pikmat" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="hebrew-text">🎓 לומדים אנגלית</h1>
            <h2>English - 8th Grade</h2>
          </div>

          <div className="login-content">
            <p className="login-subtitle hebrew-text">התחבר עם Google כדי להתחיל ללמוד</p>
            
            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="pill"
                logo_alignment="center"
                width="280"
                useOneTap={false}
                auto_select={false}
              />
            </div>

            <div className="login-features">
              <div className="feature">
                <span className="feature-icon">📚</span>
                <span className="hebrew-text">תרגול אוצר מילים אינטראקטיבי</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎯</span>
                <span className="hebrew-text">תרגילי השלמת משפטים</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⏰</span>
                <span className="hebrew-text">תרגול Past Simple & Past Progressive</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⭐</span>
                <span className="hebrew-text">מעקב אחרי ההתקדמות ונקודות ניסיון</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p className="hebrew-text">כניסה מאובטחת באמצעות Google</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
