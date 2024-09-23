// components/Header.tsx
import React from 'react';
import { Box, HStack, IconButton, Image } from '@chakra-ui/react';
import { FiLogOut } from 'react-icons/fi';

const handleLogout = async () => {
  // Clear the token from localStorage
  localStorage.removeItem('token');

  // Optionally notify the backend
  try {
    await fetch('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,  // Pass the token to the backend
      },
    });
  } catch (error) {
    console.error("Logout failed", error);
  }

  // Redirect to the login page
  window.location.href = '/frontend';
};

const Header = () => {
  return (
    <HStack justify="space-between" p={4} bg="gray.800" align="center">
      
      {/* Logo on the left */}
      <Image src="/img/logo.png" alt="Logo" boxSize="50px" /> {/* Adjust the boxSize as needed */}

      {/* Title in the middle */}
      <Box fontWeight="bold" fontSize="xl" textAlign="center" flex="1">
        J.A.R.V.I.S
      </Box>

      {/* Logout Button on the far right */}
      <IconButton
        icon={<FiLogOut />}  // Use the logout icon
        aria-label="Logout"
        size="lg"
        onClick={handleLogout}  // Use the logout function defined earlier
        bg="red.500"
        color="white"
        _hover={{ bg: 'red.400' }}
      />
    </HStack>
  );
};

export default Header;
