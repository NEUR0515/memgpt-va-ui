import React from 'react';
import { Box, HStack, IconButton, Image, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { FiLogOut, FiSun, FiMoon } from 'react-icons/fi';

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
  window.location.href = '/';
};

const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  // Dynamic styling based on color mode (light or dark)
  const bg = useColorModeValue('gray.100', 'gray.900');  // Light gray for light mode, dark gray for dark mode
  const textColor = useColorModeValue('gray.800', 'white');  // Dark text in light mode, white text in dark mode
  const hoverColor = useColorModeValue('gray.200', 'gray.700');  // Slightly lighter/darker for hover effects

  return (
    <HStack justify="space-between" p={4} bg={bg} align="center" boxShadow="md">
      {/* Logo on the left */}
      <Image src="/img/logo.png" alt="Logo" boxSize="50px" />

      {/* Title in the middle */}
      <Box fontWeight="bold" fontSize="xl" textAlign="center" color={textColor} flex="1">
        J.A.R.V.I.S
      </Box>

      {/* Toggle Theme Button */}
      <IconButton
        icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}  // Toggle between sun and moon icons
        aria-label="Toggle Theme"
        onClick={toggleColorMode}
        bg="transparent"
        color={textColor}
        _hover={{ bg: hoverColor }}  // Hover effect based on theme
        transition="background-color 0.3s"
      />

      {/* Logout Button on the far right */}
      <IconButton
        icon={<FiLogOut />}  // Use the logout icon
        aria-label="Logout"
        size="lg"
        onClick={handleLogout}
        bg="red.500"
        color="white"
        _hover={{ bg: 'red.400' }}  // Lighter red for hover effect
        transition="background-color 0.3s"
      />
    </HStack>
  );
};

export default Header;
