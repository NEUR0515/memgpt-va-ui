import React, { useState } from 'react';
import { HStack, IconButton, CircularProgress, CircularProgressLabel, Textarea, Box } from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';
import { FiMic } from 'react-icons/fi';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  audioLevel: number;
  isListening: boolean;
  toggleListening: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, audioLevel, isListening, toggleListening }) => {
  const [editorContent, setEditorContent] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of creating a new line
      onSendMessage(editorContent); // Send the message
      setEditorContent(''); // Clear the input
    }
  };

  return (
    <HStack width="100%" spacing={4} justify="center">
      {/* Textarea in the center */}
      <Box flex="1">
        <Textarea
          width="100%"  // Textarea takes up the full width of its parent
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          placeholder="Type your message here..."
          onKeyDown={handleKeyDown} // Handle key presses
        />
      </Box>

      {/* Send button */}
      <IconButton
        icon={<ArrowUpIcon />}
        aria-label="Send Message"
        variant="unstyled"
        size="lg"
        bg="blue.500"
        color="white"
        borderRadius="full"
        _hover={{ bg: 'blue.400' }}
        onClick={() => {
          onSendMessage(editorContent);
          setEditorContent('');  // Clear the input after sending the message
        }}
      />

      {/* Mic icon with progress */}
      <CircularProgress value={audioLevel} size="60px" thickness="4px" color="blue.500">
        <CircularProgressLabel>
          <IconButton
            aria-label="Microphone"
            size="lg"
            isRound
            icon={<FiMic />}
            onClick={toggleListening}
            color={isListening ? 'red.500' : 'white'}
          />
        </CircularProgressLabel>
      </CircularProgress>
    </HStack>
  );
};

export default MessageInput;
