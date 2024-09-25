import React, { useState } from 'react';
import { Box, Input, Button, Text, VStack, Image } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  ```
  /**
   * Validates the form by checking if username and password are provided.
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  
  ```  const validateForm = () => {
    if (!username || !password) {
      setError('Username and password are required');
      return false;
    }
    setError('');
    return true;
  };

  /**
   * Handles form submission for user authentication
   * @param {React.FormEvent} event - The form submission event
   * @returns {Promise<void>} No return value
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      const response = await fetch('/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDetails,
      });

      setLoading(false);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        navigate('/frontend');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Authentication failed!');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <VStack spacing={4} justify="center" align="center" height="100vh" bg="gray.900">
      {/* Logo Section */}
      <Box mb={8}>
        <Image src="/img/logo.png" alt="Logo" boxSize="100px" /> {/* Add your logo here */}
      </Box>

      {/* Login Form */}
      <Box
        bg="gray.700"
        p={8}
        borderRadius="md"
        shadow="md"
        width="100%"
        maxWidth="400px"
        textAlign="center"
      >
        <Text fontSize="2xl" fontWeight="bold" mb={4} color="white">
          Login
        </Text>
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <Input
              placeholder="Username"
              value={username}
              /**
               * Event handler for username input change
               * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
               * @returns {void} This function doesn't return a value
               */
              onChange={(e) => setUsername(e.target.value)}
              bg="gray.600"
              color="white"
            /**
             * Updates the password state with the input value
             * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object from the input field
             * @returns {void} This function doesn't return a value
             */
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              bg="gray.600"
              color="white"
            />
            <Button
              type="submit"
              isLoading={loading}
              colorScheme="blue"
              width="100%"
            >
              Login
            </Button>
          </VStack>
        </form>
        {error && <Text color="red.500" mt={4}>{error}</Text>}
        <Text mt={4} color="gray.300">
          Don't have an account?{' '}
          <Link to="/register">
            <Text as="span" color="blue.400" fontWeight="bold">
              Register
            </Text>
          </Link>
        </Text>
      </Box>
    </VStack>
  );
};

export default Login;
