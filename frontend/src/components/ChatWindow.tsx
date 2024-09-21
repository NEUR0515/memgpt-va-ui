import React from 'react';
import { Box, VStack, Text, HStack, Avatar } from '@chakra-ui/react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import './ChatWindow.css';  // Import the CSS file

interface ChatWindowProps {
  messages: Message[];  // Messages array to render
  messagesEndRef: React.RefObject<HTMLDivElement>;  // Ref for scrolling
}

const getAvatarSrc = (role: string) => {
  if (role === 'user') {
    return '/img/alfie.png'; // Path to the user's avatar
  }
  return '/img/jarvis.gif';  // Path to Jarvis avatar
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, messagesEndRef }) => {
  return (
    <VStack flex="1" bg="gray.800" p={4} spacing={4} justify="flex-end" align="center" maxHeight={{ base: '60vh', md: '80vh' }} overflowY="auto">
      <Box flex="1" width="60%" bg="gray.800" p={4} borderRadius="md" overflowY="auto">
        {messages.map((message, index) => (
          <HStack
            key={index}
            className={`chat-message ${message.role} ${message.type === 'thought' ? 'thought-message' : ''}`}  // Apply CSS class for thought
          >
            {/* Avatar */}
            <Avatar name={message.name} src={getAvatarSrc(message.role)} className="avatar" />

            {/* Message content */}
            <VStack align="flex-start" spacing={1}>
              <HStack spacing={3}>
                {/* Name and timestamp */}
                <Text fontWeight="bold" color="white">{message.name}</Text>
                <Text fontSize="xs" color="gray.400">{message.timestamp}</Text>
              </HStack>
              
              {/* Thought message icon */}
              {message.type === 'thought' && (
                <HStack spacing={1}>
                  <Box as="span" className="thought-icon">💡</Box> {/* Example thought icon */}
                  <Text fontStyle="italic" color="gray.300">{message.content}</Text>
                </HStack>
              )}

              {/* Regular message */}
              {/* Render markdown content */}
              {message.type !== 'thought' && (
                <Box color="white">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
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
