import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A React functional component that handles user logout.
 * It removes the authentication token from localStorage and redirects to the home page.
 * @returns {null} This component doesn't render any UI elements.
 */
const Logout: React.FC = () => {
  const navigate = useNavigate();

  /**
   * Clears the authentication token and redirects to the login page
   * @param {Function} navigate - The navigation function from React Router
   * @returns {void} This effect does not return a value
   */
  useEffect(() => {
    // Clear the token from localStorage
    localStorage.removeItem('token');

    // Redirect to login page
    navigate('/');
  }, [navigate]);

  return null;  // No UI is needed, just perform the logout
};

export default Logout;
