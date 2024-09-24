import React from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

interface LiveTranscriptionProps {
  transcription: string;
}

const LiveTranscription: React.FC<LiveTranscriptionProps> = ({ transcription }) => {
  
  // Define colors based on light/dark mode
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.700');  // Subtle border based on theme
  
  return (
    <Box
      width="100%"
      mt={4}
      bg={bgColor}
      p={4}  // Increased padding for better readability
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}  // Border for subtle differentiation
      transition="background-color 0.3s, color 0.3s"  // Smooth transition between light/dark mode
    >
      <Text color={textColor} fontStyle="italic" textAlign="center" fontSize="lg">
        Transcription: {transcription || 'No transcription available'}
      </Text>
    </Box>
  );
}

export default LiveTranscription;
