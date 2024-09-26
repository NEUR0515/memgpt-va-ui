import React from 'react';
import { Box, VStack, Text, HStack, Avatar, useColorModeValue } from '@chakra-ui/react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose your theme

import './ChatWindow.css';  // Import the CSS file

interface ChatWindowProps {
  messages: Message[];  // Messages array to render
  messagesEndRef: React.RefObject<HTMLDivElement>;  // Ref for scrolling
  username: string;  // Pass the username prop
  firstName: string;  // Pass the name prop
  profilePicture: string | null;  // Add profile picture prop
}

const getAvatarSrc = (role: string, profilePicture: string | null) => {
  if (role === 'user') {
    return profilePicture || '/img/default-avatar.png'; // Return user's profile picture or default avatar
  }
  return '/img/jarvis.gif';  // Path to Jarvis avatar
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, messagesEndRef, username, profilePicture, firstName }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const codeBlockStyle = useColorModeValue(materialLight, materialDark);  // Adjust theme based on mode

  // Custom component for code blocks with a copy-to-clipboard button
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <Box position="relative" bg={bgColor} borderRadius="md" overflow="hidden">
          <SyntaxHighlighter style={codeBlockStyle} language={match[1]} PreTag="div" {...props}>
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
          <button
            onClick={() => navigator.clipboard.writeText(String(children))}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#4a5568',  // Better suited for dark mode
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'background 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3748')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4a5568')}
          >
            Copy code
          </button>
        </Box>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <VStack
      flex="1"
      bg={bgColor}
      color={textColor}
      p={4}
      spacing={4}
      justify="flex-end"
      align="center"
      height="100%"  // Ensure the VStack takes up full height
    >
      <Box width="80%" overflowY="auto" height="100%"> {/* Only set scroll on this Box */}
        {messages.map((message, index) => (
          <HStack
            key={index}
            className={`chat-message ${message.role} ${message.type === 'thought' ? 'thought-message' : ''}`}
            alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
            maxWidth="fit-content"
          >
            {/* Avatar */}
            <Avatar
              name={message.name}
              src={getAvatarSrc(message.role, profilePicture)}  // Use the updated avatar source
              className="avatar"
            />
            {/* Message content */}
            <VStack align="flex-start" spacing={1} maxWidth="fit-content">
              <HStack spacing={3}>
                {/* Name and timestamp */}
                <Text fontWeight="bold" color={textColor}>
                  {message.role === 'user' ? firstName : message.name} {/* Show username for user */}
                </Text>
                <Text fontSize="xs" color="gray.400">{message.timestamp}</Text>
              </HStack>

              {/* Thought message icon */}
              {message.type === 'thought' && (
                <HStack spacing={1}>
                  <Box as="span" className="thought-icon">💭</Box>
                  <Text fontStyle="italic" color="gray.300">{message.content}</Text>
                </HStack>
              )}

              {/* Regular message with Markdown support */}
              {message.type !== 'thought' && (
                <Box className={`message-bubble ${message.role}`} p={3} borderRadius="lg">
                  <ReactMarkdown components={components}>{message.content}</ReactMarkdown> {/* Show as Markdown */}
                </Box>
              )}
            </VStack>
          </HStack>
        ))}
        <div ref={messagesEndRef}></div> {/* Ensure this is at the end of the messages */}
      </Box>
    </VStack>
  );
};

export default ChatWindow;
