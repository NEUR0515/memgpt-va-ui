import React, { useState, useEffect } from 'react';
import { Box, Input, Button, VStack, FormControl, FormLabel, Heading, Text, Alert, AlertIcon, Spinner, Image } from '@chakra-ui/react';

/**
 * UserProfile component for displaying and updating user profile information
 * @returns {JSX.Element} A form for viewing and editing user profile details
 */
const UserProfile: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  /**
   * Fetches and sets the current user's profile data
   * @param {void} No parameters
   * @returns {void} No return value, but updates state variables with user data
   */
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch the current user details (You need to have an API endpoint for fetching user data)
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/user-profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setEmail(data.email);
        setProfilePicture(data.profile_picture);
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    fetchUserData();
  }, []);

  /**
   * Validates the form inputs for user registration or profile update
   * @returns {boolean} True if the form is valid, false otherwise
   */
  const validateForm = () => {
    if (!firstName || !lastName || !email) {
      setError('First name, last name, and email are required');
      return false;
    }
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    /**
     * Handles the profile update process when the form is submitted.
     * @param {React.FormEvent} event - The form submission event.
     * @returns {Promise<void>} Nothing is returned, but the function updates the component state based on the API response.
     */
    setError('');
    return true;
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const updatedUserDetails = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      profile_picture: profilePicture,
      ...(password ? { password } : {}), // Only include password if it's filled
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUserDetails),
      });

      setLoading(false);

      if (response.ok) {
        setSuccess('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Profile update failed');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.900">
      <Box width="400px" p={6} bg="gray.700" borderRadius="md" boxShadow="lg">
        <Box display="flex" justifyContent="center" mb={4}>
          <Image src={profilePicture || '/img/default-avatar.png'} alt="Profile Picture" boxSize="100px" borderRadius="full" />
        </Box>

        <Heading mb={6} color="white" textAlign="center">My Profile</Heading>

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
            <FormControl id="firstName">
              <FormLabel color="gray.300">First Name</FormLabel>
              <Input
                value={firstName}
                /**
                 * Updates the firstName state with the input value
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the input field
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="lastName">
              <FormLabel color="gray.300">Last Name</FormLabel>
              <Input
                value={lastName}
                /**
                 * Handles the change event for the last name input field
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="email">
              <FormLabel color="gray.300">Email Address</FormLabel>
              <Input
                type="email"
                value={email}
                /**
                 * Event handler for email input change
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="profilePicture">
              <FormLabel color="gray.300">Profile Picture (URL)</FormLabel>
              <Input
                value={profilePicture}
                /**
                 * Handles the change event for the profile picture input
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function doesn't return a value
                 */
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter your profile picture URL"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            <FormControl id="password">
              <FormLabel color="gray.300">New Password (optional)</FormLabel>
              <Input
                type="password"
                value={password}
                /**
                 * Event handler for password input change
                 * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
                 * @returns {void} This function does not return a value
                 */
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                bg="gray.600"
                color="white"
                focusBorderColor="blue.500"
              />
            </FormControl>

            /**
             * Event handler for updating the confirm password state
             * @param {React.ChangeEvent<HTMLInputElement>} e - The change event object
             * @returns {void} This function does not return a value
             */
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
              />
            </FormControl>

            <Button type="submit" colorScheme="blue" width="full" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Update Profile'}
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default UserProfile;
