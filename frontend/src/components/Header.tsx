import React, { useState, useEffect } from 'react';
import { Box, HStack, IconButton, Image, useColorMode, useColorModeValue, Text, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('/img/default-avatar.png');  // Default avatar
  const navigate = useNavigate();  // Navigation hook to redirect

  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login if no token
        window.location.href = '/login';
        return;
      }

      try {
        const response = await fetch('/api/user-info', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 403) {
          // Token expired or invalid, redirect to login
          console.error('Token expired or invalid. Redirecting to login.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        
        const data = await response.json();
        setUsername(data.username);
        setProfilePicture(data.profile_picture || '/img/default-avatar.png');  // Set profile picture or fallback to default
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchUsername();
  }, []);

  // Dynamic styling based on color mode (light or dark)
  const bg = useColorModeValue('gray.100', 'gray.900');  // Light gray for light mode, dark gray for dark mode
  const textColor = useColorModeValue('gray.800', 'white');  // Dark text in light mode, white text in dark mode
  const hoverColor = useColorModeValue('gray.200', 'gray.700');  // Slightly lighter/darker for hover effects

  return (
    <HStack justify="space-between" p={4} bg={bg} align="center" boxShadow="md" width="100%" maxW="100vw">
      {/* Logo on the left */}
      <Image src="/img/logo.png" alt="Logo" boxSize={{ base: "40px", md: "50px" }} />

      {/* Title in the middle */}
      <Box fontWeight="bold" fontSize={{ base: "lg", md: "xl" }} textAlign="center" whiteSpace="nowrap" color={textColor} flex="1">
        J.A.R.V.I.S
      </Box>

      {/* Display the username */}
      <Text fontSize={{ base: "md", md: "lg" }} color={textColor}>
        {username ? `Welcome, ${username}` : 'Loading...'}
      </Text>

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

      {/* Profile Icon Menu */}
      <Menu>
        <MenuButton>
          <Avatar size="md" name={username} src={profilePicture} cursor="pointer" />
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => navigate('/profile')}>My Profile</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </MenuList>
      </Menu>
    </HStack>
  );
};

export default Header;
