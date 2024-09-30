// LogoutButton.tsx
import React, { useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { useToast } from '@chakra-ui/react';

const Logout: React.FC = () => {
  const { setIsAuthenticated } = useContext(AuthContext);
  const toast = useToast();
  // Utility function to extract error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as any).message;
    } else {
      return 'An unexpected error occurred';
    }
  };
  const handleLogout = async () => {
    try {
      await axios.post('/logout', {}, { withCredentials: true });
      setIsAuthenticated(false);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      window.location.href = '/login';
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Logout Error:', message);
      toast({
        title: 'Logout Error',
        description: 'Unable to log out. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
};

export default Logout;
