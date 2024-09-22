import React, { useState } from 'react';
import { HStack, IconButton, CircularProgress, CircularProgressLabel, Textarea, Box, Flex } from '@chakra-ui/react';
import { ArrowUpIcon, AttachmentIcon, CalendarIcon } from '@chakra-ui/icons';
import { FiMic } from 'react-icons/fi';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  audioLevel: number;
  isListening: boolean;
  toggleListening: () => void;
  toggleLeftPanel: () => void;   // Prop for toggling the left panel
  toggleRightPanel: () => void;  // Prop for toggling the right panel
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  audioLevel,
  isListening,
  toggleListening,
  toggleLeftPanel,
  toggleRightPanel
}) => {
  const [editorContent, setEditorContent] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of creating a new line
      onSendMessage(editorContent); // Send the message
      setEditorContent(''); // Clear the input
    }
  };

  return (
    <Flex
      width="100%"
      justify="center"
      align="center"
      p={4}
      bg="gray.900"
    >
      <Flex
        width={{ base: '100%', md: '50%' }}  // Full width on mobile, 50% on larger screens
        align="center"
        justify="space-between"  // Spread the icons and the text area evenly
      >
        {/* Left Sidebar Toggle Button */}
        <IconButton
          icon={<AttachmentIcon />}
          aria-label="Toggle File Preview"
          size="lg"
          bg="gray.600"
          color="white"
          borderRadius="full"  // Make the button round
          _hover={{ bg: 'gray.500' }}
          w="50px"  // Fixed width for uniform size
          h="50px"  // Fixed height for uniform size
          onClick={toggleLeftPanel} // Call the prop function to toggle the left panel
        />

        {/* Textarea in the center */}
        <Box flex="1" mx={4}>
          <Textarea
            width="100%"  // Takes full width within its container
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Type your message here..."
            onKeyDown={handleKeyDown}  // Handle key presses
          />
        </Box>

        {/* Send button */}
        <IconButton
          icon={<ArrowUpIcon />}
          aria-label="Send Message"
          size="lg"
          bg="blue.500"
          color="white"
          borderRadius="full"  // Make the button round
          _hover={{ bg: 'blue.400' }}
          w="50px"  // Fixed width for uniform size
          h="50px"  // Fixed height for uniform size
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
              w="50px"  // Fixed width for uniform size
              h="50px"  // Fixed height for uniform size
              onClick={toggleListening}
              color={isListening ? 'red.500' : 'white'}
            />
          </CircularProgressLabel>
        </CircularProgress>

        {/* Right Sidebar Toggle Button */}
        <IconButton
          icon={<CalendarIcon />}
          aria-label="Toggle Right Sidebar"
          size="lg"
          bg="gray.600"
          color="white"
          borderRadius="full"  // Make the button round
          _hover={{ bg: 'gray.500' }}
          w="50px"  // Fixed width for uniform size
          h="50px"  // Fixed height for uniform size
          onClick={toggleRightPanel} // Call the prop function to toggle the right panel
        />
      </Flex>
    </Flex>
  );
};

export default MessageInput;
