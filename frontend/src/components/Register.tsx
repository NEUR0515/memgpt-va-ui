import React, { useState } from 'react';
import { Box, Input, Button, VStack, FormControl, FormLabel, Heading, Text, Alert, AlertIcon, Spinner, Image } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

/**
 * Register component for user registration
 * @param {void} - This component doesn't accept any props
 * @returns {JSX.Element} A form for user registration with input fields for first name, last name, email, username, password, confirm password, and optional profile picture
 */
const Register: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState('');  // Optional profile picture URL
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  /**
   * Validates the form input fields for user registration.
   * @returns {boolean} True if all fields are valid, false otherwise.
   */
  const validateForm = () => {
    if (!username || !password || !confirmPassword || !firstName || !lastName || !email) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    /**
     * Handles the submission of a user registration form.
     * @param {React.FormEvent} event - The form submission event.
     * @returns {Promise<void>} Nothing
     */
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
      profile_picture: profilePicture || null,  // Optional profile picture
    };

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDetails),
      });

      setLoading(false);

      if (response.ok) {
        setSuccess('Registration successful!');
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
        {success && (
          <Alert status="success" mb={4}>
            <AlertIcon />
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            /**
             * Updates the firstName state with the input value
             * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the input field
             * @returns {void} This function doesn't return a value
             */
            <FormControl id="firstName">
              <FormLabel color="gray.300">First Name</FormLabel>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <FormControl id="lastName">
              <FormLabel color="gray.300">Last Name</FormLabel>
              <Input
                value={lastName}
                /**
                 * Event handler for updating the last name state
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <FormControl id="email">
              <FormLabel color="gray.300">Email</FormLabel>
              <Input
                type="email"
                value={email}
                /**
                 * Handle email input change
                 * @param {Object} e - The event object from the input change
                 * @returns {void} This function does not return a value
                 */
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <FormControl id="username">
              <FormLabel color="gray.300">Username</FormLabel>
              <Input
                value={username}
                /**
                 * Handles the change event for the username input field
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function does not return a value
                 */
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            /**
             * Event handler for password input change
             * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
             * @returns {void} This function doesn't return a value
             */
            <FormControl id="password">
              <FormLabel color="gray.300">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <FormControl id="confirmPassword">
              <FormLabel color="gray.300">Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                /**
                 * Updates the confirm password state with the input value
                 * @param {Object} e - The event object from the input change
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <FormControl id="profilePicture">
              <FormLabel color="gray.300">Profile Picture (Optional)</FormLabel>
              <Input
                value={profilePicture}
                ```
                /**
                 * Handles the change event for updating the profile picture URL
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function doesn't return a value
                 */
                ```
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter profile picture URL"
                bg="gray.600"
                color="white"
              />
            </FormControl>

            <Button type="submit" colorScheme="blue" width="full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Register'}
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Register;
