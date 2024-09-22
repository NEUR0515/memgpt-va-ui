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
    <VStack
      flex="1"
      bg="gray.800"
      p={4}
      spacing={4}
      justify="flex-end"
      align="center"  // Ensure the content is centered
      maxHeight={{ base: '60vh', md: '80vh' }}
      overflowY="auto"
    >
      <Box width="80%" overflowY="auto">  {/* Center the messages container and set it to 80% width */}
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
                <Text fontWeight="bold" color="white">{message.name}</Text>
                <Text fontSize="xs" color="gray.400">{message.timestamp}</Text>
              </HStack>

              {/* Thought message icon */}
              {message.type === 'thought' && (
                <HStack spacing={1}>
                  <Box as="span" className="thought-icon">💡</Box>
                  <Text fontStyle="italic" color="gray.300">{message.content}</Text>
                </HStack>
              )}

              {/* Regular message */}
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
