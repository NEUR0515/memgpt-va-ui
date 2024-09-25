import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;  // Represents the child components that will be rendered if authenticated
}

/**
 * A protected route component that checks for authentication before rendering its children.
 * It verifies the presence of a token in localStorage and optionally validates it with the backend.
 * If authentication fails, it redirects to the login page.
 * @param {React.ReactNode} children - The child components to be rendered if authentication is successful.
 * @returns {JSX.Element} The children components if authenticated, otherwise redirects to the login page.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();

  ```
  /**
   * Verifies user authentication token on component mount
   * @param {function} navigate - Function to navigate to different routes
   * @returns {void} This effect does not return anything
   */
  ```
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');  // Redirect to login if no token is found
    }

    // Optionally verify the token with the backend to make sure it's still valid
    const verifyToken = async () => {
      try {
        const response = await fetch(`/verify-token/${token}`);
        if (!response.ok) {
          throw new Error('Token verification failed');
        }
      } catch (error) {
        localStorage.removeItem('token');
        navigate('/');  // Redirect to login if token is invalid
      }
    };

    verifyToken();
  }, [navigate]);

  return <>{children}</>;  // Render the children (protected components) if authenticated
};

export default ProtectedRoute;
