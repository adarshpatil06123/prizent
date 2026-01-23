import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // After successful login, redirect to brands page
    navigate('/brands');
  };

  return (
    <div className="login-bg">
      <div className="login-form-bg">
        <div className="login-content">
          <h1 className="login-title">Prizent</h1>
          <p className="login-subtitle">Where fashion meets intelligent pricing</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="email" className="login-label">Your Email</label>
              <input type="email" id="email" className="login-input" placeholder="enter your username" autoComplete="username" />
            </div>
            <div className="login-form-group">
              <label htmlFor="password" className="login-label">Your Password</label>
              <input type="password" id="password" className="login-input" placeholder="enter your password" autoComplete="current-password" />
            </div>
            <div className="login-actions">
              <button type="button" className="forgot-password-btn">Forgot password?</button>
            </div>
            <button type="submit" className="login-btn">Access workspace</button>
          </form>
        </div>
      </div>
      <div className="login-image-bg"></div>
    </div>
  );
};

export default LoginPage;