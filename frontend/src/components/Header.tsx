import React, { useState, useEffect } from 'react';
import { Box, HStack, IconButton, Image, useColorMode, useColorModeValue, Text, Avatar, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const handleLogout = async () => {
  localStorage.removeItem('token');

  try {
    await fetch('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
  } catch (error) {
    console.error("Logout failed", error);
  }

  window.location.href = '/';
};

const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('/img/default-avatar.png');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
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
          console.error('Token expired or invalid. Redirecting to login.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        
        const data = await response.json();
        setUsername(data.username);
        setProfilePicture(data.profile_picture || '/img/default-avatar.png');
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchUsername();
  }, []);

  const bg = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const hoverColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box position="relative" width="100%" maxW="100vw" boxShadow="md" bg={bg} p={4}>
      <HStack justify="space-between" align="center">
        {/* Logo on the left */}
        <Image src="/img/logo.png" alt="Logo" boxSize={{ base: "40px", md: "50px" }} />

        {/* Profile Icon Menu on the right */}
        <HStack>
          <IconButton
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            aria-label="Toggle Theme"
            onClick={toggleColorMode}
            bg="transparent"
            color={textColor}
            _hover={{ bg: hoverColor }}
            transition="background-color 0.3s"
          />

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
      </HStack>

      {/* Title in the center */}
      <Box position="absolute" left="50%" top="50%" transform="translate(-50%, -50%)">
        <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }} color={textColor} textAlign="center">
          J.A.R.V.I.S
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
