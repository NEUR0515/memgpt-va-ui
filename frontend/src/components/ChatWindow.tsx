import React from 'react';
import { Box, VStack, Text, HStack, Avatar, useColorModeValue } from '@chakra-ui/react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import './ChatWindow.css';  // Import the CSS file

interface ChatWindowProps {
  messages: Message[];  // Messages array to render
  messagesEndRef: React.RefObject<HTMLDivElement>;  // Ref for scrolling
  username: string;  // Pass the username prop
}

const getAvatarSrc = (role: string) => {
  if (role === 'user') {
    return '/img/alfie.png'; // Path to the user's avatar
  }
  return '/img/jarvis.gif';  // Path to Jarvis avatar
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, messagesEndRef, username }) => {  // Add username to props
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const userBubbleColor = useColorModeValue('blue.500', 'blue.300');
  const aiBubbleColor = useColorModeValue('gray.600', 'gray.700');
  
  return (
    <VStack
      flex="1"
      bg={bgColor}
      color={textColor}
      p={4}
      spacing={4}
      justify="flex-end"
      align="center"
      maxHeight={{ base: '60vh', md: '80vh' }}
      overflowY="auto"
    >
      <Box width="80%" overflowY="auto">
        {messages.map((message, index) => (
          <HStack
            key={index}
            className={`chat-message ${message.role} ${message.type === 'thought' ? 'thought-message' : ''}`}
            alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
            maxWidth="fit-content"
          >
            {/* Avatar */}
            <Avatar name={message.name} src={getAvatarSrc(message.role)} className="avatar" />

            {/* Message content */}
            <VStack align="flex-start" spacing={1} maxWidth="fit-content">
              <HStack spacing={3}>
                {/* Name and timestamp */}
                <Text fontWeight="bold" color={textColor}>
                  {message.role === 'user' ? username : message.name} {/* Show username for user */}
                </Text>
                <Text fontSize="xs" color="gray.400">{message.timestamp}</Text>
              </HStack>

              {/* Thought message icon */}
              {message.type === 'thought' && (
                <HStack spacing={1}>
                  <Box as="span" className="thought-icon">💡</Box>
                  <Text fontStyle="italic" color="gray.300">{message.content}</Text>
                </HStack>
              )}

              {/* Regular message with Markdown support */}
              {message.type !== 'thought' && (
                <Box className={`message-bubble ${message.role}`} p={3} borderRadius="lg">
                  <ReactMarkdown>{message.content}</ReactMarkdown> {/* Show as Markdown */}
                </Box>
              )}
            </VStack>
          </HStack>
        ))}
        <div ref={messagesEndRef}></div>
      </Box>
    </VStack>
  );
};

export default ChatWindow;
