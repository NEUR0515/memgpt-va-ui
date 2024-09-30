import React, { useState, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Image,
  IconButton,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons'; // Import the close icon
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation

const UserProfile: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        });

        if (response.ok) {
          const data = await response.json();
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setEmail(data.email);
          setProfilePicture(data.profile_picture || '/img/default-avatar.png'); // Use default if not set
        } else if (response.status === 401 || response.status === 403) {
          setError('Unauthorized access. Redirecting to login.');
          setTimeout(() => {
            navigate('/login');
          }, 2000); // 2-second delay for user to read the message
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to load user data.');
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setError('An error occurred while fetching user data.');
      }
    };

    fetchUserData();
  }, [navigate]);

  const validateForm = () => {
    if (!firstName || !lastName || !email) {
      setError('First name, last name, and email are required.');
      return false;
    }
    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    // Optionally, add more validation (e.g., email format)
    setError(null);
    return true;
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const updatedUserDetails: any = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      profile_picture: profilePicture || null, // Optional profile picture
    };

    if (password) {
      updatedUserDetails.password = password;
    }

    try {
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Removed Authorization header
        },
        body: JSON.stringify(updatedUserDetails),
        credentials: 'include', // Include cookies in the request
      });

      setLoading(false);

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setError(null);
      } else if (response.status === 401 || response.status === 403) {
        setError('Unauthorized access. Redirecting to login.');
        setSuccess(null);
        setTimeout(() => {
          navigate('/login');
        }, 2000); // 2-second delay
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Profile update failed.');
        setSuccess(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('An error occurred. Please try again later.');
      setLoading(false);
      setSuccess(null);
    }
  };

  return (
    <Box
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.900"
      position="relative"
    >
      <Box width="400px" p={6} bg="gray.700" borderRadius="md" boxShadow="lg">
        {/* Close button */}
        <IconButton
          icon={<CloseIcon />}
          aria-label="Close profile"
          position="absolute"
          top="10px"
          right="10px"
          onClick={() => navigate('/frontend')} // Navigate back to the frontend
          variant="ghost"
          colorScheme="whiteAlpha"
        />

        <Box display="flex" justifyContent="center" mb={4}>
          <Image
            src={profilePicture || '/img/default-avatar.png'}
            alt="Profile Picture"
            boxSize="100px"
            borderRadius="full"
          />
        </Box>

        <Heading mb={6} color="white" textAlign="center">
          My Profile
        </Heading>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}
        {success && (
          <Alert status="success" mb={4}>
            <AlertIcon />
            {success}
          </Alert>
        )}

        <form onSubmit={handleUpdateProfile}>
          <VStack spacing={4}>
            <FormControl id="firstName" isRequired>
              <FormLabel color="gray.300">First Name</FormLabel>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="lastName" isRequired>
              <FormLabel color="gray.300">Last Name</FormLabel>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="email" isRequired>
              <FormLabel color="gray.300">Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="profilePicture">
              <FormLabel color="gray.300">Profile Picture (URL)</FormLabel>
              <Input
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter your profile picture URL"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="password">
              <FormLabel color="gray.300">New Password (optional)</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="confirmPassword">
              <FormLabel color="gray.300">Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={loading}
              loadingText="Updating"
            >
              Update Profile
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default UserProfile;
