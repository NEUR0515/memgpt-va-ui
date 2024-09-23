import React, { useState } from 'react';
import { Box, Input, Button, VStack, FormControl, FormLabel, Heading, Text, Alert, AlertIcon, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const validateForm = () => {
    if (!username || !password) {
      setError('Username and password are required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      const response = await fetch('http://localhost:8000/token', {
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
    <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.900">
      <Box width="400px" p={6} bg="gray.700" borderRadius="md" boxShadow="lg">
        <Heading mb={6} color="white" textAlign="center">Login</Heading>

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

            <Button type="submit" colorScheme="blue" width="full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Login'}
            </Button>

            {/* Link to Register */}
            <Text color="gray.400" fontSize="sm">
              Don't have an account?{' '}
              <Text as="span" color="blue.300" cursor="pointer" onClick={() => navigate('/register')}>
                Register
              </Text>
            </Text>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Login;
