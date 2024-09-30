// MessageInput.tsx
import React, { useState } from 'react';
import {
  IconButton,
  CircularProgress,
  CircularProgressLabel,
  Textarea,
  Box,
  Flex,
  Button,
  useColorModeValue,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ArrowUpIcon, AttachmentIcon, CalendarIcon } from '@chakra-ui/icons';
import { FiMic } from 'react-icons/fi';
import { FaSpotify } from 'react-icons/fa';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onClearMessages: () => void; // Add this line
  audioLevel: number;
  isListening: boolean;
  toggleListening: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  isSpotifyVisible: boolean;
  setIsSpotifyVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onClearMessages, // Add this line
  audioLevel,
  isListening,
  toggleListening,
  toggleLeftPanel,
  toggleRightPanel,
  isSpotifyVisible,
  setIsSpotifyVisible,
}) => {
  const [editorContent, setEditorContent] = useState('');

  const handleClearMessages = () => {
    if (window.confirm('Are you sure you want to clear all messages?')) {
      onClearMessages(); // Call the prop function
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editorContent.trim() !== '') {
        onSendMessage(editorContent.trim());
        setEditorContent('');
      }
    }
  };

  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const buttonBgColor = useColorModeValue('gray.600', 'gray.600');
  const buttonHoverColor = useColorModeValue('gray.500', 'gray.500');
  const sendButtonColor = useColorModeValue('blue.500', 'blue.400');

  const showOtherButtons = useBreakpointValue({ base: false, md: true });

  return (
    <Flex
      width="100%"
      justify="center"
      align="center"
      p={4}
      bg={bgColor}
      color={textColor}
      borderTop="1px solid"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      direction={{ base: 'column', md: 'row' }}
    >
      <Flex width={{ base: '100%', md: '50%' }} align="center" justify="space-between">
        {showOtherButtons && (
          <IconButton
            icon={<AttachmentIcon />}
            aria-label="Toggle File Preview"
            size="lg"
            bg={buttonBgColor}
            color="white"
            borderRadius="full"
            _hover={{ bg: buttonHoverColor }}
            w="50px"
            h="50px"
            onClick={toggleLeftPanel}
          />
        )}

        {showOtherButtons && (
          <Flex justify="center" p={4}>
            <Button colorScheme="red" onClick={handleClearMessages}>
              Clear Messages
            </Button>
          </Flex>
        )}

        <Box flex="1" mx={4}>
          <Textarea
            width="100%"
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Type your message here..."
            onKeyDown={handleKeyDown}
            borderColor={useColorModeValue('gray.300', 'gray.600')}
            _focus={{ borderColor: 'blue.500', outline: 'none' }}
            mb={{ base: 4, md: 0 }}
          />
        </Box>

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
          mb={{ base: 4, md: 0 }}
          onClick={() => {
            if (editorContent.trim() !== '') {
              onSendMessage(editorContent.trim());
              setEditorContent('');
            }
          }}
        />

        <Box position="relative">
          <CircularProgress value={audioLevel} size="60px" thickness="4px" color="blue.500">
            <CircularProgressLabel>
              <IconButton
                aria-label="Microphone"
                size={{ base: '40px', md: '60px' }}
                isRound
                icon={<FiMic />}
                w={{ base: '40px', md: '50px' }}
                h={{ base: '40px', md: '50px' }}
                onClick={toggleListening}
                color={isListening ? 'red.500' : 'gray.600'}
                bg={isListening ? 'gray.100' : 'gray.200'}
                _hover={{ bg: isListening ? 'gray.200' : 'gray.300' }}
              />
            </CircularProgressLabel>
          </CircularProgress>
        </Box>

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
            onClick={toggleRightPanel}
          />
        )}
        {/* Spotify Toggle Icon Button */}
        {showOtherButtons && (
          <IconButton
            aria-label="Toggle Spotify Player"
            icon={<FaSpotify />}
            size="lg"
            bg={isSpotifyVisible ? 'teal' : 'gray'}
            color="white"
            borderRadius="full"
            _hover={{ bg: isSpotifyVisible ? 'teal.500' : 'gray.500' }}
            w="50px"
            h="50px"
            ml={2}
            onClick={() => setIsSpotifyVisible(!isSpotifyVisible)}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default MessageInput;
