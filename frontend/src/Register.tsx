import React, { useState } from 'react';
import { Box, Input, Button, VStack, FormControl, FormLabel, Heading, Text, Alert, AlertIcon, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateForm = () => {
    if (!username || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
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
    };

    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
      });

      setLoading(false);

      if (response.ok) {
        navigate('/');  // Redirect to login page after successful registration
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
    <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.900">
      <Box width="400px" p={6} bg="gray.700" borderRadius="md" boxShadow="lg">
        <Heading mb={6} color="white" textAlign="center">Register</Heading>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl id="username">
              <FormLabel color="gray.300">Username</FormLabel>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter your username" 
                bg="gray.600" 
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="password">
              <FormLabel color="gray.300">Password</FormLabel>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter your password" 
                bg="gray.600" 
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="confirmPassword">
              <FormLabel color="gray.300">Confirm Password</FormLabel>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm your password" 
                bg="gray.600" 
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <Button type="submit" colorScheme="blue" width="full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Register'}
            </Button>

            <Text color="gray.400" fontSize="sm">
                Already have an account?{' '}
                <Text as="span" color="blue.300" cursor="pointer" onClick={() => navigate('/')}>
                    Login
                </Text>
            </Text>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Register;
