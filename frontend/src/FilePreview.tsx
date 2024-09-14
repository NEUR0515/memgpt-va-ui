import React from 'react';
import { Box, Text } from '@chakra-ui/react';

function FilePreview() {
  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>File Previews</Text>
      {/* Placeholder for file previews */}
      <Box bg="gray.800" p={4} rounded="md" height="300px" overflowY="auto">
        <Text color="gray.400">Uploaded files will be shown here...</Text>
      </Box>
    </Box>
  );
}

export default FilePreview;
