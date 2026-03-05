import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout service
        await authService.logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Always navigate to login page
        navigate('/login', { replace: true });
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      Logging out...
    </div>
  );
};

export default Logout;
