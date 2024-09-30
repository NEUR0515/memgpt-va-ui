import React, { useState } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Heading,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  IconButton,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons'; // Import the close icon
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(''); // Optional profile picture URL
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const validateForm = () => {
    if (!username || !password || !confirmPassword || !firstName || !lastName || !email) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    // Optionally, add more validation (e.g., email format)
    setError('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const userDetails = {
      username: username,
      password: password,
      first_name: firstName,
      last_name: lastName,
      email: email,
      profile_picture: profilePicture || null, // Optional profile picture
    };

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
        credentials: 'include', // Include cookies in the request if necessary
      });

      setLoading(false);

      if (response.ok) {
        setSuccess('Registration successful! Redirecting to login...');
        // Optionally, you can automatically log the user in here if the backend sets the cookie
        // For now, we'll navigate to the login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000); // 2-second delay for user to read the success message
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
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
          aria-label="Close registration"
          position="absolute"
          top="10px"
          right="10px"
          onClick={() => navigate('/frontend')} // Navigate back to the frontend
          variant="ghost"
          colorScheme="whiteAlpha"
        />

        <Heading mb={6} color="white" textAlign="center">
          Register
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

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl id="firstName" isRequired>
              <FormLabel color="gray.300">First Name</FormLabel>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                bg="gray.600"
                color="white"
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
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="email" isRequired>
              <FormLabel color="gray.300">Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                bg="gray.600"
                color="white"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="username" isRequired>
              <FormLabel color="gray.300">Username</FormLabel>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg="gray.600"
                color="white"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="password" isRequired>
              <FormLabel color="gray.300">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                bg="gray.600"
                color="white"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="confirmPassword" isRequired>
              <FormLabel color="gray.300">Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                bg="gray.600"
                color="white"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <FormControl id="profilePicture">
              <FormLabel color="gray.300">Profile Picture (Optional)</FormLabel>
              <Input
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter profile picture URL"
                bg="gray.600"
                color="white"
                _placeholder={{ color: 'gray.400' }}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={loading}
              loadingText="Registering"
            >
              Register
            </Button>
          </VStack>
        </form>

        <Text mt={4} color="gray.300" textAlign="center">
          Already Registered?{' '}
          <Link to="/login">
            <Text as="span" color="blue.400" fontWeight="bold">
              Login
            </Text>
          </Link>
        </Text>
      </Box>
    </Box>
  );
};

export default Register;
