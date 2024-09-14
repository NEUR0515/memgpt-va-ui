import React from 'react';
import { Box, Text } from '@chakra-ui/react';

function ConsoleOutput() {
  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Console Output</Text>
      {/* Placeholder for actual console output */}
      <Box bg="gray.800" p={4} rounded="md" height="300px" overflowY="auto">
        <Text color="gray.400">Console output will be shown here...</Text>
      </Box>
    </Box>
  );
}

export default ConsoleOutput;
