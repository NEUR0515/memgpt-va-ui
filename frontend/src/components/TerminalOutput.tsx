// components/TerminalOutput.tsx
import React from 'react';
import { Box, Text } from '@chakra-ui/react';

interface TerminalOutputProps {
  terminalLogs: string[];
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ terminalLogs }) => {
  return (
    <Box bg="black" color="green.400" p={3} fontFamily="monospace" overflowY="auto" maxHeight="300px">
      {terminalLogs.map((log, index) => (
        <Text key={index}>{log}</Text>
      ))}
    </Box>
  );
};

export default TerminalOutput;
