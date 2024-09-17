import React, { useState, useEffect, useRef } from 'react';
import { Box, Flex, VStack, HStack, IconButton, Input, Text, Button, useDisclosure, CircularProgress, CircularProgressLabel, Textarea } from '@chakra-ui/react';
import { AttachmentIcon, ChatIcon, SettingsIcon, ArrowUpIcon } from '@chakra-ui/icons';
import { FiMic } from 'react-icons/fi'; // Importing Microphone icon from react-icons
// import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';  // Import the editor styles
// import EmojiPicker from 'emoji-picker-react';
import { BrainCog } from 'lucide-react';

// Example placeholder data for messages
const initialMessages = [
  { role: 'user', content: 'Hello, Jarvis!' },
  { role: 'ai', content: 'Hello! How can I assist you today?' }
];

interface Message {
  role: 'user' | 'ai';
  content: string;
  type?: 'thought' | 'log';  // Optional 'type' field for thoughts or logs
}

// Declare the types for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-GB';

function App() {
  const { isOpen: isLeftPanelOpen, onToggle: toggleLeftPanel } = useDisclosure();
  const { isOpen: isRightPanelOpen, onToggle: toggleRightPanel } = useDisclosure();
  const [inputMessage, setInputMessage] = useState(''); // New message input state
  const [transcription, setTranscription] = useState(''); // Transcription state
  const [isListening, setIsListening] = useState(false); // Toggle for voice recognition
  const [audioLevel, setAudioLevel] = useState(0); // Audio level state
  const [socket, setSocket] = useState<WebSocket | null>(null); // WebSocket state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling
  const [messages, setMessages] = useState<Message[]>([]);

  // Sanitize function to strip HTML tags
  const sanitizeHTML = (html: string) => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    return tempElement.textContent || tempElement.innerText || ''; // Returns plain text
  };

  // Function to scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Establish WebSocket connection
    const ws = new WebSocket('ws://localhost:8000/ws');
    setSocket(ws);
  
    ws.onopen = () => {
      console.log("WebSocket connection opened.");
    };
  
    ws.onmessage = (event) => {
      console.log("Received message from WebSocket:", event.data);  // Log the raw data
      
      let data: string | { [key: string]: any };
    
      try {
        data = JSON.parse(event.data);  // Try to parse the data as JSON
        console.log("Parsed message:", data);
      } catch (e) {
        // If it's not JSON, handle it as plain text
        console.log("Received non-JSON message:", event.data);
    
        // Check if the message is a log (e.g., it starts with 'LOG:')
        if (event.data.startsWith("LOG:")) {
          setTerminalLogs((prevLogs) => [...prevLogs, event.data]);  // Append to terminal logs
          return;
        }
        
        data = { message: event.data };  // Wrap the plain text in an object with a 'message' property
      }
    
      // Stop transcription when the assistant responds
      recognition.stop();
      // Show typing indicator before Jarvis responds
      setIsTyping(true);
    
      if (typeof data === 'object' && 'type' in data && data.type === 'log') {
        setTerminalLogs((prevLogs) => [...prevLogs, (data as { message: string }).message]);  // Append new log to terminalLogs
      } 
      // Process thought messages
      else if (typeof data === 'object' && 'type' in data && data.type === 'thought') {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'ai', content: (data as { message: string }).message, type: 'thought' }  // Thought message
        ]);
        setIsTyping(false);  // Hide typing indicator after response
      }
      // Process regular messages
      else if (typeof data === 'object' && 'message' in data) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'ai', content: (data as { message: string }).message }  // Store the message
        ]);
        setIsTyping(false);  // Hide typing indicator after response
      }
    
      // Scroll to the bottom of the chat history after every message is received
      scrollToBottom();
    };
  
    // Handle WebSocket errors
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    // Cleanup WebSocket connection on unmount
    return () => {
      ws.close();
    };
  }, []);  // Empty dependency array so this runs only once on component mount
  

  // Initialize messages from localStorage on load
  useEffect(() => {
    const savedMessages = localStorage.getItem('conversationHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages)); // Restore conversation history
    }
  }, []);

  // Save the current messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('conversationHistory', JSON.stringify(messages));
  }, [messages]);

  // Simulate audio levels
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 100)); // Simulate random audio levels from 0 to 100
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Function to send messages from the user to the backend
  const sendMessage = (message: string) => {
    if (socket) {
      const data = { message };
      socket.send(JSON.stringify(data)); // Send the message to the backend
      // Add the user's message to the message history
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: message }
      ]);
    }
  };

  // Toggle voice recognition on or off
  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

  recognition.onresult = (event: any) => {
    let interimTranscription = '';
    let finalTranscription = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscription += transcript;
      } else {
        interimTranscription += transcript;
      }
    }

    // Display the interim transcription
    setTranscription(interimTranscription);

    // When final transcription is received, send the message to the backend
    if (finalTranscription) {
      sendMessage(finalTranscription); // Send to the assistant via WebSocket
      setTranscription(''); // Clear the interim transcription
    }
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error', event.error);
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // Safely access the first file
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Send the file to the backend for processing
    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'ai', content: `Jarvis analyzed the file and says: ${result.message}` }
    ]);
  };

  return (
    <Flex direction="column" height="100vh" bg="gray.900" color="white">
      {/* Header */}
      <HStack justify="center" p={4} bg="gray.800">
        <Box fontWeight="bold" fontSize="xl">
          J.A.R.V.I.S
        </Box>
        {/* <HStack spacing={4}> */}
          {/* <IconButton icon={<AttachmentIcon />} aria-label="Toggle File Preview" size="lg" onClick={toggleLeftPanel} /> */}
          {/* <IconButton icon={<SettingsIcon />} aria-label="Toggle Console Output" size="lg" onClick={toggleRightPanel} /> */}
          {/* <IconButton aria-label="Microphone" size="lg" onClick={toggleListening}>
            <Box color={isListening ? "red.500" : "white"}>
              <FiMic />
            </Box>
          </IconButton> */}
          {/* <HStack>
            <IconButton icon={<ChatIcon />} aria-label="Microphone" size="lg" />
            <CircularProgress value={audioLevel} size="50px" thickness="8px" color="blue.500">
              <CircularProgressLabel>{audioLevel}%</CircularProgressLabel>
            </CircularProgress>
          </HStack> */}
        {/* </HStack> */}
      </HStack>

      {/* Main Content */}
      <Flex flex="1" overflow="hidden">
        {/* Left Sidebar */}
        {isLeftPanelOpen && (
          <Box width="20%" bg="gray.700" p={4} overflowY="auto">
            {/* File Preview Component */}
            <Input type="file" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg,.txt" hidden ref={fileInputRef} />
            <Button onClick={() => fileInputRef.current?.click()}>Attach File</Button>
          </Box>
        )}

        {/* Center: Conversation Area */}
        <VStack flex="1" bg="gray.800" p={4} spacing={4} justify="flex-end">
          {/* Conversation Messages */}
          <Box flex="1" width="50%" bg="gray.800" p={4} borderRadius="md" overflowY="auto">
            {messages.map((msg, index) => (
              <Flex key={index} justify={msg.role === 'user' ? 'flex-end' : 'flex-start'} mb={2}>
                <Box bg={msg.role === 'user' ? 'blue.500' : 'gray.700'} color="white" p={3} borderRadius="md" maxWidth="70%" textAlign={msg.role === 'user' ? 'right' : 'left'}>
                {msg.type === 'thought' && (
                  <HStack>
                    <Box as={BrainCog} />  {/* Brain icon */}
                    <Text fontStyle="italic">Thought:</Text>
                  </HStack>
                )}
                  <Text>{msg.content}</Text>
                </Box>
              </Flex>
            ))}
            <div ref={messagesEndRef} /> {/* Add a reference to scroll to */}
          </Box>
          {isTyping && (
            <Flex justify="flex-start" mb={2}>
              <Box bg="gray.700" color="white" p={3} borderRadius="md" maxWidth="70%">
                <Text>Jarvis is typing...</Text>
              </Box>
            </Flex>
          )}

          <HStack
            width="100%"
            p={4}
            bg="gray.800"
            justify="center"
            align="center"
            spacing={2}
            borderRadius="full"
            boxShadow="md"
          >
            {/* <IconButton
              icon={<AttachmentIcon />}
              aria-label="Attach File"
              variant="unstyled"
              size="lg"
              bg="gray.600"
              color="white"
              _hover={{ bg: 'gray.500' }}
              onClick={toggleLeftPanel}
            /> */}
            {/* Use Textarea instead of Input to support multiline */}
            <Textarea
              variant="unstyled"
              placeholder="Type your message here..."
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault(); // Prevents Enter from adding a new line
                  const plainTextMessage = sanitizeHTML(editorContent);
                  sendMessage(plainTextMessage); // Send the plain text content
                  setEditorContent(''); // Clear editor after sending
                }
                // Shift+Enter will automatically add a new line by default in a textarea
              }}
              bg="gray.700"
              color="white"
              borderRadius="full"
              p={4}
              flex={0.5}
              _placeholder={{ color: 'gray.400' }}
              resize="none"  // Prevents resizing of the textarea
            />
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
                const plainTextMessage = sanitizeHTML(editorContent);
                sendMessage(plainTextMessage); // Send the plain text content
                setEditorContent(''); // Clear editor after sending
              }}
            />
            <CircularProgress value={audioLevel} size="60px" thickness="4px" color="blue.500">
              <CircularProgressLabel>
                <IconButton
                  aria-label="Microphone"
                  size="lg"
                  isRound
                  icon={<FiMic />}
                  onClick={toggleListening}  // This toggles the isListening state
                  color={isListening ? "red.500" : "white"}
                />
              </CircularProgressLabel>
            </CircularProgress>
          </HStack>

        </VStack>
        {/* Right Sidebar */}
        {isRightPanelOpen && (
          <Box width="20%" bg="gray.700" p={4} overflowY="auto">
            <Text fontSize="lg" fontWeight="bold" mb={4}>Terminal Output</Text>
            <Box bg="black" color="green.400" p={3} fontFamily="monospace" overflowY="auto" maxHeight="300px">
              {terminalLogs.map((log, index) => <Text key={index}>{log}</Text>)}
            </Box>
          </Box>
        )}
      </Flex>
      <HStack width="100%" mt={2}>
      {/* Live Transcription */}
        <Box width="100%" mt={4}>
          <Text color="gray.500" fontStyle="italic"><center>Transcription: {transcription}</center></Text>
        </Box>
      </HStack>
      {/* Footer */}
      <HStack p={4} bg="gray.800" justify="center">
        {/* Placeholder for footer items */}
      </HStack>
    </Flex>

  );
}

export default App;
