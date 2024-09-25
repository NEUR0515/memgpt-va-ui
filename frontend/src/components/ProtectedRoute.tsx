import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;  // Represents the child components that will be rendered if authenticated
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();

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
