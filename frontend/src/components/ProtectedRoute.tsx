import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Center } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: React.ReactNode; // Represents the child components that will be rendered if authenticated
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          navigate('/login'); // Redirect to login if not authenticated
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        navigate('/login'); // Redirect to login if an error occurs
      }
    };

    checkAuthentication();
  }, [navigate]);

  if (isAuthenticated === null) {
    // While checking authentication, display a loading spinner
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return <>{children}</>; // Render the children (protected components) if authenticated
};

export default ProtectedRoute;
