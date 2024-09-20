import React, { useState, useRef, useEffect } from 'react';
import { Flex, Box, useDisclosure } from '@chakra-ui/react';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import TerminalOutput from './components/TerminalOutput';
import LiveTranscription from './components/LiveTranscription';
import { Message } from './types';

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
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for microphone listening
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState(''); // Transcription state

  // WebSocket connection setup with proper initialization
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const webSocket = new WebSocket('ws://172.16.3.80:8000/ws');
    setWs(webSocket);

    webSocket.onopen = () => {
      console.log("WebSocket connection opened.");
    };

    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleIncomingMessage(data);
    };

    webSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    webSocket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      if (webSocket.readyState !== WebSocket.CLOSED) {
        webSocket.close();  // Close WebSocket when the component unmounts
      }
    };
  }, []);

  // Function to handle incoming WebSocket messages and trigger speech synthesis
  const handleIncomingMessage = (data: any) => {
    if (data.type === 'thought') {
      const thoughtMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Thought',
        type: 'thought'  // Ensure the thought message type is set
      };
      setMessages((prevMessages) => [...prevMessages, thoughtMessage]);
      scrollToBottom();
    } else {
      // Regular AI message
      const aiMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Jarvis'
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      scrollToBottom();

      // **Speech synthesis to speak the AI's response aloud**
      // const utterance = new SpeechSynthesisUtterance(data.message);
      // window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = (message: string) => {
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString(),
      name: 'User',
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: userMessage.content }));
      setMessages((prevMessages) => [...prevMessages, userMessage]);
    } else {
      console.error("WebSocket is not open. Cannot send message.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('http://172.16.3.80:8000/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    const aiMessage: Message = {
      role: 'ai',
      content: `Jarvis analyzed the file and says: ${result.message}`,
      timestamp: new Date().toLocaleTimeString(),
      name: 'Jarvis',
    };
    setMessages((prevMessages) => [...prevMessages, aiMessage]);
  };

  // Toggle microphone listening
  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      console.log("Microphone deactivated.");
    } else {
      recognition.start();
      console.log("Microphone activated.");
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

    // Display interim transcription
    setTranscription(interimTranscription);

    // Send final transcription as a message
    if (finalTranscription) {
      handleSendMessage(finalTranscription);
      setTranscription(''); // Clear transcription
    }
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  // Simulate audio levels for mic activity
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.floor(Math.random() * 100)); // Simulate random audio levels
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Flex direction="column" height="100vh">
      <Header />
      <Flex
        flex="1"
        overflow="hidden"
        direction={{ base: 'column', md: 'row' }}  // Mobile view: Column, Desktop: Row
      >
        {isLeftPanelOpen && (
          <Box
            width={{ base: '100%', md: '20%' }}  // Full width on mobile
            bg="gray.700"
            p={4}
            overflowY="auto"
          >
            <FileUploader onFileUpload={handleFileUpload} />
          </Box>
        )}
        <Box flex="1" bg="gray.800" p={4}>
          <ChatWindow messages={messages} messagesEndRef={messagesEndRef} />
        </Box>
        {isRightPanelOpen && (
          <Box
            width={{ base: '100%', md: '20%' }}  // Full width on mobile
            bg="gray.700"
            p={4}
            overflowY="auto"
          >
            <TerminalOutput terminalLogs={[]} />
          </Box>
        )}
      </Flex>
      <LiveTranscription transcription={transcription} />
      <MessageInput
        onSendMessage={handleSendMessage}
        toggleLeftPanel={toggleLeftPanel}
        toggleRightPanel={toggleRightPanel}
        audioLevel={audioLevel}
        isListening={isListening}
        toggleListening={toggleListening}
      />
    </Flex>
  );
}

export default App;
