// components/LiveTranscription.tsx
import React from 'react';
import { Box, Text } from '@chakra-ui/react';

interface LiveTranscriptionProps {
  transcription: string;
}

const LiveTranscription: React.FC<LiveTranscriptionProps> = ({ transcription }) => {
  return (
    <Box width="100%" mt={4}>
      <Text color="gray.500" fontStyle="italic" textAlign="center">
        Transcription: {transcription}
      </Text>
    </Box>
  );
};

export default LiveTranscription;
