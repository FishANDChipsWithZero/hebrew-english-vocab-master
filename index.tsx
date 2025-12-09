import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './context/AuthContext';
import AppWithAuth from './AppWithAuth';
import './styles.css';

// Error boundary component to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#020617',
          color: '#f8fafc',
          fontFamily: 'Heebo, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>😕 משהו השתבש</h1>
          <p style={{ marginBottom: '8px' }}>אירעה שגיאה בטעינת האפליקציה</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            טען מחדש
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Google OAuth Client ID - will be configured in Vercel environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

console.log('🚀 Starting application...');
console.log('Environment:', import.meta.env.MODE);
console.log('Client ID configured:', GOOGLE_CLIENT_ID ? 'Yes' : 'No');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#020617;color:#f8fafc;font-family:Heebo,sans-serif;text-align:center;"><div><h1 style="font-size:24px;margin-bottom:16px;">❌ שגיאה</h1><p>לא נמצא אלמנט root בדף</p></div></div>';
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <AppWithAuth />
            <Analytics />
          </AuthProvider>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('✅ Application mounted successfully');
} catch (error) {
  console.error('❌ Failed to mount application:', error);
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#020617;color:#f8fafc;font-family:Heebo,sans-serif;text-align:center;"><div><h1 style="font-size:24px;margin-bottom:16px;">❌ שגיאה</h1><p>נכשל בטעינת האפליקציה</p><button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">טען מחדש</button></div></div>';
}