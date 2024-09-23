// components/Header.tsx
import React from 'react';
import { Box, HStack, IconButton, Spacer } from '@chakra-ui/react';
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
      {/* Spacer will push the title to the center */}
      <Spacer />
      
      {/* Title in the middle */}
      <Box fontWeight="bold" fontSize="xl" textAlign="center">
        J.A.R.V.I.S
      </Box>

      {/* Spacer to balance the title in the center */}
      <Spacer />

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
