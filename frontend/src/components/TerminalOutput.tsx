// components/TerminalOutput.tsx
import React from 'react';
import { Box, Text } from '@chakra-ui/react';

interface TerminalOutputProps {
  terminalLogs: string[];
}

/**
 * Renders a terminal-like output component using React
 * @param {Object} props - The component props
 * @param {string[]} props.terminalLogs - An array of log messages to display
 * @returns {JSX.Element} A Box component styled like a terminal, containing the log messages
 */
const TerminalOutput: React.FC<TerminalOutputProps> = ({ terminalLogs }) => {
  return (
    <Box bg="black" color="green.400" p={3} fontFamily="monospace" overflowY="auto" maxHeight="300px">
      /**
       * Renders a list of terminal logs as text components
       * @param {Array} terminalLogs - An array of log messages to be displayed
       * @returns {Array} An array of React Text components, each containing a log message
       */
      {terminalLogs.map((log, index) => (
        <Text key={index}>{log}</Text>
      ))}
    </Box>
  );
};

export default TerminalOutput;
