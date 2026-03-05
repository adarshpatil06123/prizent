import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from './services/authService';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(username, password);
      
      if (response.success && response.token) {
        // Check user role and navigate accordingly
        const user = authService.getCurrentUser();
        
        if (user?.roles?.includes('SUPERADMIN')) {
          navigate('/superadmin');
        } else {
          navigate('/categories');
        }
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-form-bg">
        <div className="login-content">
          <h1 className="login-title">Prizent</h1>
          <p className="login-subtitle">Where fashion meets intelligent pricing</p>
          
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div style={{ 
                color: '#e74c3c', 
                backgroundColor: '#fadbd8', 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            <div className="login-form-group">
              <label htmlFor="email" className="login-label">Your Email</label>
              <input 
                type="text" 
                id="email" 
                className="login-input" 
                placeholder="enter your username" 
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="login-form-group">
              <label htmlFor="password" className="login-label">Your Password</label>
              <input 
                type="password" 
                id="password" 
                className="login-input" 
                placeholder="enter your password" 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="login-actions">
              <button type="button" className="forgot-password-btn">Forgot password?</button>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Access workspace'}
            </button>
          </form>
        </div>
      </div>
      <div className="login-image-bg"></div>
    </div>
  );
};

export default LoginPage;