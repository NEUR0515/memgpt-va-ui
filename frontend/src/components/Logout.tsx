import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear the token from localStorage
    localStorage.removeItem('token');

    // Redirect to login page
    navigate('/');
  }, [navigate]);

  return null;  // No UI is needed, just perform the logout
};

export default Logout;
