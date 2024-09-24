import React, { useState } from 'react';
import { IconButton, CircularProgress, CircularProgressLabel, Textarea, Box, Flex, Button, useColorModeValue, useBreakpointValue } from '@chakra-ui/react';
import { ArrowUpIcon, AttachmentIcon, CalendarIcon } from '@chakra-ui/icons';
import { FiMic } from 'react-icons/fi';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  audioLevel: number;
  isListening: boolean;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;  // Accept setMessages as a prop
  toggleListening: () => void;
  toggleLeftPanel: () => void;   // Prop for toggling the left panel
  toggleRightPanel: () => void;  // Prop for toggling the right panel
}

const MessageInput: React.FC<MessageInputProps> = ({
  setMessages,
  onSendMessage,
  audioLevel,
  isListening,
  toggleListening,
  toggleLeftPanel,
  toggleRightPanel
}) => {
  const [editorContent, setEditorContent] = useState('');

  // Function to handle clearing messages
  const handleClearMessages = (setMessages: React.Dispatch<React.SetStateAction<any[]>>) => {
    setMessages([]);  // Clear messages from UI
    localStorage.removeItem("chatMessages");  // Clear messages from localStorage
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of creating a new line
      onSendMessage(editorContent); // Send the message
      setEditorContent(''); // Clear the input
    }
  };

  // Define colors for light/dark mode
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const buttonBgColor = useColorModeValue('gray.600', 'gray.600');
  const buttonHoverColor = useColorModeValue('gray.500', 'gray.500');
  const sendButtonColor = useColorModeValue('blue.500', 'blue.400');

  // Show only the send and mic buttons on mobile, and all buttons on larger screens
  const showOtherButtons = useBreakpointValue({ base: false, md: true });

  return (
    <Flex
      width="100%"
      justify="center"
      align="center"
      p={4}
      bg={bgColor}
      color={textColor}
      borderTop="1px solid"  // Adds a border to separate the input from the chat window
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      direction={{ base: 'column', md: 'row' }}  // Stack elements vertically on mobile
    >
      <Flex
        width={{ base: '100%', md: '50%' }}  // Full width on mobile, 50% on larger screens
        align="center"
        justify="space-between"
      >
        {/* Left Sidebar Toggle Button (Hidden on Mobile) */}
        {showOtherButtons && (
          <IconButton
            icon={<AttachmentIcon />}
            aria-label="Toggle File Preview"
            size="lg"
            bg={buttonBgColor}
            color="white"
            borderRadius="full"  // Make the button round
            _hover={{ bg: buttonHoverColor }}
            w="50px"
            h="50px"
            onClick={toggleLeftPanel}  // Call the prop function to toggle the left panel
          />
        )}

        {/* Clear Messages Button (Hidden on Mobile) */}
        {showOtherButtons && (
          <Flex justify="center" p={4}>
            <Button colorScheme="red" onClick={() => handleClearMessages(setMessages)}>
              Clear Messages
            </Button>
          </Flex>
        )}

        {/* Textarea in the center */}
        <Box flex="1" mx={4}>
          <Textarea
            width="100%"  // Takes full width within its container
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Type your message here..."
            onKeyDown={handleKeyDown}  // Handle key presses
            borderColor={useColorModeValue('gray.300', 'gray.600')}  // Add a border to the textarea
            _focus={{ borderColor: 'blue.500', outline: 'none' }}  // Focus state for better accessibility
            mb={{ base: 4, md: 0 }}  // Adds margin on mobile for spacing
          />
        </Box>

        {/* Send button */}
        <IconButton
          icon={<ArrowUpIcon />}
          aria-label="Send Message"
          size="lg"
          bg={sendButtonColor}
          color="white"
          borderRadius="full"
          _hover={{ bg: 'blue.400' }}
          w="50px"
          h="50px"
          mb={{ base: 4, md: 0 }}  // Adds margin on mobile for spacing
          onClick={() => {
            onSendMessage(editorContent);
            setEditorContent('');  // Clear the input after sending the message
          }}
        />

        {/* Mic icon with progress */}
        <Box position="relative">
          <CircularProgress 
            value={audioLevel} 
            size="60px" 
            thickness="4px" 
            color="blue.500"
          >
            <CircularProgressLabel>
              <IconButton
                aria-label="Microphone"
                size={{ base: "40px", md: "60px" }}
                isRound
                icon={<FiMic />}
                w={{ base: "40px", md: "50px" }}
                h={{ base: "40px", md: "50px" }}
                onClick={toggleListening}
                color={isListening ? 'red.500' : 'gray.600'}
                bg={isListening ? 'gray.100' : 'gray.200'}  // Background color to make it stand out
                _hover={{ bg: isListening ? 'gray.200' : 'gray.300' }}  // Add hover effect
              />
            </CircularProgressLabel>
          </CircularProgress>
        </Box>

        {/* Right Sidebar Toggle Button (Hidden on Mobile) */}
        {showOtherButtons && (
          <IconButton
            icon={<CalendarIcon />}
            aria-label="Toggle Right Sidebar"
            size="lg"
            bg={buttonBgColor}
            color="white"
            borderRadius="full"
            _hover={{ bg: buttonHoverColor }}
            w="50px"
            h="50px"
            onClick={toggleRightPanel}  // Call the prop function to toggle the right panel
          />
        )}
      </Flex>
    </Flex>
  );
};

export default MessageInput;
