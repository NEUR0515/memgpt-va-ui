import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Image,
  useColorMode,
  useColorModeValue,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiSun, FiMoon, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  isTtsEnabled: boolean;
  setIsTtsEnabled: (value: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isTtsEnabled, setIsTtsEnabled }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('/img/default-avatar.png');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        });

        if (response.status === 401 || response.status === 403) {
          console.error('Unauthorized. Redirecting to login.');
          window.location.href = '/login';
          return;
        }

        const data = await response.json();
        setUsername(data.username);
        setProfilePicture(data.profile_picture || '/img/default-avatar.png');

        // Only set the TTS state if it's not already initialized
        if (localStorage.getItem('ttsEnabled') === null) {
          localStorage.setItem('ttsEnabled', JSON.stringify(isTtsEnabled));
        } else {
          const savedTtsEnabled = JSON.parse(localStorage.getItem('ttsEnabled')!);
          setIsTtsEnabled(savedTtsEnabled);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        window.location.href = '/login';
      }
    };

    fetchUserProfile();
  }, [isTtsEnabled, setIsTtsEnabled]);

  const toggleTts = () => {
    const newTtsState = !isTtsEnabled;
    setIsTtsEnabled(newTtsState);
    localStorage.setItem('ttsEnabled', JSON.stringify(newTtsState));
  };

  const handleLogout = async () => {
    try {
      // Send a POST request to '/logout' with credentials included
      await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed', error);
    }

    // Redirect to login page
    window.location.href = '/login';
  };

  const handleSpotifyLogout = () => {
    // Remove the Spotify token from wherever it's stored (if applicable)
    // For example, if stored in localStorage:
    localStorage.removeItem('spotifyToken');

    // Optionally redirect or refresh the page to reflect the logout
    window.location.reload(); // or navigate to another page
  };

  const bg = useColorModeValue('gray.100', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const hoverColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box position="relative" width="100%" maxW="100vw" boxShadow="md" bg={bg} p={4}>
      <HStack justify="space-between" align="center">
        {/* Logo on the left with link to homepage */}
        <a href="/frontend">
          <Image src="/img/logo.png" alt="Logo" boxSize={{ base: '40px', md: '50px' }} cursor="pointer" />
        </a>

        {/* Profile Icon Menu on the right */}
        <HStack spacing={4}>
          {/* TTS toggle */}
          <IconButton
            icon={isTtsEnabled ? <FiVolume2 /> : <FiVolumeX />}
            aria-label="Toggle TTS"
            onClick={toggleTts}
          />
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
              <MenuItem onClick={handleSpotifyLogout}>Logout from Spotify</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </HStack>

      {/* Title in the center */}
      <Box position="absolute" left="50%" top="50%" transform="translate(-50%, -50%)">
        <Text fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }} color={textColor} textAlign="center">
          J.A.R.V.I.S
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
