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
            <h1 className="hebrew-text">🎓 לומדים אנגלית</h1>
            <h2>Hebrew-English Vocabulary Practice</h2>
          </div>

          <div className="login-content">
            <p className="login-subtitle">Sign in with Google to start learning</p>
            
            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_blue"
                size="large"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
                width="280"
              />
            </div>

            <div className="login-features">
              <div className="feature">
                <span className="feature-icon">📚</span>
                <span>Interactive vocabulary practice</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎯</span>
                <span>Sentence fill-in exercises</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⭐</span>
                <span>Track your progress and XP</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>Secure sign-in powered by Google</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
