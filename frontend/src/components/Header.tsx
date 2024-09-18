// components/Header.tsx
import React from 'react';
import { Box, HStack } from '@chakra-ui/react';

const Header = () => {
  return (
    <HStack justify="center" p={4} bg="gray.800">
      <Box fontWeight="bold" fontSize="xl">
        J.A.R.V.I.S
      </Box>
      {/* You can uncomment and add additional buttons here as needed */}
      {/* <IconButton icon={<AttachmentIcon />} aria-label="Toggle File Preview" size="lg" onClick={toggleLeftPanel} /> */}
      {/* <IconButton icon={<SettingsIcon />} aria-label="Toggle Console Output" size="lg" onClick={toggleRightPanel} /> */}
    </HStack>
  );
};

export default Header;
