import React, { useState, useRef, useEffect, useReducer, useCallback, useContext } from 'react';
import { Flex, Box, useDisclosure, useColorModeValue, useToast } from '@chakra-ui/react';
import Header from './Header';
import FileUploader from './FileUploader';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import LiveTranscription from './LiveTranscription';
import CalendarSection from './CalendarSection';
import TaskManager from './TaskManager';
import { Message } from '../types';
import sanitizeHtml from 'sanitize-html';
import WebPlayback from './WebPlayback';
import axios from 'axios';
import { AuthContext } from './AuthContext';

// Set Axios to send credentials with every request
axios.defaults.withCredentials = true;

// Define the types for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    Spotify: any;
  }
}

// Reducer function for managing messages and saving to localStorage
function messagesReducer(state: Message[], action: { type: string; message?: Message }): Message[] {
  let newState: Message[];  // Explicitly defining the type of newState as Message[]

  switch (action.type) {
    case 'add':
      newState = [...state, action.message!];  // Assuming action.message is always defined when type is 'add'
      break;
    case 'clear':
      newState = [];
      break;
    default:
      return state;
  }

  // Save the updated messages to localStorage
  localStorage.setItem('chatMessages', JSON.stringify(newState));
  return newState;
}

function Jarvis() {
  const { isOpen: isLeftPanelOpen, onToggle: toggleLeftPanel } = useDisclosure();
  const { isOpen: isRightPanelOpen, onToggle: toggleRightPanel } = useDisclosure();
  const [messages, dispatchMessages] = useReducer(messagesReducer, [], () => {
    // Load messages from localStorage on initial render
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastPlayedMessage, setLastPlayedMessage] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    const savedTtsPreference = localStorage.getItem('ttsEnabled');
    return savedTtsPreference ? JSON.parse(savedTtsPreference) : true;
  });
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isSpotifyVisible, setIsSpotifyVisible] = useState<boolean>(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const toast = useToast();
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);
  const [isSpotifyLoggedIn, setIsSpotifyLoggedIn] = useState<boolean>(false); // State for Spotify login

  // Utility function to extract error messages
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as any).message;
    } else {
      return 'An unexpected error occurred';
    }
  };

  // Fetch user info (username and profile picture)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          credentials: 'include',
        });

        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid, redirect to login
          setIsAuthenticated(false);
          window.location.href = '/login';
        } else {
          const data = await response.json();
          setUsername(data.username);
          setFirstName(data.first_name);
          setProfilePicture(data.profile_picture || '/img/default-avatar.png');
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Unable to fetch user profile.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsAuthenticated(false);
      }
    };

    fetchUserProfile();
  }, [setIsAuthenticated, toast]);

  // WebSocket connection setup with proper initialization
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const webSocket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    webSocket.onopen = () => {
      console.log('WebSocket connection opened.');
    };

    webSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleIncomingMessage(data);
    };

    webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'WebSocket Error',
        description: 'An error occurred with the WebSocket connection.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    };

    webSocket.onclose = () => {
      console.log('WebSocket connection closed.');
    };

    setWs(webSocket);

    return () => {
      if (webSocket.readyState !== WebSocket.CLOSED) {
        webSocket.close(); // Close WebSocket when the component unmounts
      }
    };
  }, [toast]);

  // Function to fetch and play the TTS MP3
  const playTTSResponse = useCallback(async () => {
    if (!isTtsEnabled) {
      console.log('TTS is disabled, skipping playback.');
      return;
    }

    try {
      const response = await fetch('/api/play-tts', {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play(); // Automatically play the audio
    } catch (error) {
      console.error('Error playing TTS audio:', error);
    }
  }, [isTtsEnabled]);

// Function to handle incoming messages including thought, AI messages, and function calls
const handleIncomingMessage = useCallback(
  (data: any) => {
    if (data.type === 'thought') {
      const thoughtMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Thought',
        type: 'thought',
      };
      dispatchMessages({ type: 'add', message: thoughtMessage });
      scrollToBottom();
    } else if (data.type === 'function_call') {
      // Check if it's not a send_message function call
      if (data.message.includes('Function: send_message')) {
        return; // Do nothing, ignore the send_message function calls
      }

      const functionCallMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Function Call',
        type: 'function_call', // Use a new type for function calls
      };
      dispatchMessages({ type: 'add', message: functionCallMessage });
      scrollToBottom();
    } else {
      const aiMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Jarvis',
      };
      dispatchMessages({ type: 'add', message: aiMessage });
      scrollToBottom();

      if (isTtsEnabled && data.message !== lastPlayedMessage) {
        playTTSResponse();
        setLastPlayedMessage(data.message);
      }
    }
  },
  [isTtsEnabled, lastPlayedMessage, playTTSResponse]
);

  const handleSendMessage = useCallback(
    (message: string) => {
      // Sanitize the user's input to remove any unwanted HTML or Markdown
      const sanitizedMessage = sanitizeHtml(message, {
        allowedTags: [], // No HTML tags allowed (plain text only)
        allowedAttributes: {}, // No attributes allowed
      });

      const userMessage: Message = {
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date().toLocaleTimeString(),
        name: username ?? 'User',
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: userMessage.content }));
        dispatchMessages({ type: 'add', message: userMessage });
      } else {
        console.error('WebSocket is not open. Cannot send message.');
        toast({
          title: 'Connection Error',
          description: 'Unable to send message. WebSocket is not connected.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      scrollToBottom();
    },
    [username, ws, toast]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      const aiMessage: Message = {
        role: 'ai',
        content: `Jarvis analyzed the file and says: ${result.message}`,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Jarvis',
      };
      dispatchMessages({ type: 'add', message: aiMessage });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'File Upload Failed',
        description: 'An error occurred while uploading the file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Speech recognition setup
  useEffect(() => {
    let recognition: any;
    if (isListening) {
      if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser.');
        toast({
          title: 'Speech Recognition Unavailable',
          description: 'Your browser does not support speech recognition.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setIsListening(false);
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';

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

        // Send final transcription as a message and stop listening
        if (finalTranscription) {
          handleSendMessage(finalTranscription);
          setTranscription(''); // Clear transcription
          recognition.stop(); // Stop the microphone after the message is sent
          setIsListening(false); // Update the state to reflect the mic is no longer listening
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: 'Speech Recognition Error',
          description: `Error occurred: ${event.error}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      console.log('Microphone activated.');
    }

    // Cleanup function
    return () => {
      if (recognition && recognition.abort) {
        recognition.abort();
        console.log('Microphone deactivated.');
      }
    };
  }, [isListening, handleSendMessage, toast]);

  // Toggle microphone listening
  const toggleListening = () => {
    setIsListening((prevState) => !prevState);
  };

  // Simulate audio levels for mic activity
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 100)); // Simulate random audio levels
      }, 500);
    } else {
      setAudioLevel(0);
    }
    return () => {
      clearInterval(interval);
    };
  }, [isListening]);

  const handleSpotifyLogin = () => {
    // Directly navigate to the backend's /auth/login endpoint
    window.location.href = '/auth/login';
  };

  const handleClearMessages = () => {
    dispatchMessages({ type: 'clear' });
    localStorage.removeItem('chatMessages');
  };

  // Function to fetch Spotify token from backend and check login status
  const fetchSpotifyToken = async (): Promise<string> => {
    try {
      const response = await axios.get('/api/spotify-token', {
        withCredentials: true,
      });
      if (response.data.spotify_token) {
        setIsSpotifyLoggedIn(true); // User is logged in if token is valid
      } else {
        setIsSpotifyLoggedIn(false); // No valid token means the user is not logged in
      }
      return response.data.spotify_token;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error fetching Spotify token:', message);
      toast({
        title: 'Spotify Token Error',
        description: 'Unable to retrieve Spotify token. Please log in again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIsSpotifyLoggedIn(false); // If error, set to not logged in
      return '';
    }
  };

  // Check if user is logged into Spotify on mount
  useEffect(() => {
    fetchSpotifyToken();
  }, []);

  return (
    <Flex direction="column" height="100vh">
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled} />
      <Flex flex="1" overflow="hidden" direction={{ base: 'column', md: 'row' }}>
        {isLeftPanelOpen && (
          <Box width={{ base: '100%', md: '20%' }} bg={bgColor} color={textColor} p={4} overflowY="auto">
            <FileUploader onFileUpload={handleFileUpload} />
          </Box>
        )}
        <Box flex="1" bg={bgColor} p={4}>
          <ChatWindow
            messages={messages}
            messagesEndRef={messagesEndRef}
            username={username ?? 'User'}
            profilePicture={profilePicture}
            firstName={firstName ?? 'Name'}
          />
        </Box>
        {isRightPanelOpen && (
          <Box width={{ base: '100%', md: '20%' }} bg={bgColor} p={4} overflowY="auto">
            <CalendarSection />
            <TaskManager />
          </Box>
        )}
      </Flex>
      <LiveTranscription transcription={transcription} />
      <MessageInput
        onSendMessage={handleSendMessage}
        onClearMessages={handleClearMessages}
        toggleLeftPanel={toggleLeftPanel}
        toggleRightPanel={toggleRightPanel}
        audioLevel={audioLevel}
        isListening={isListening}
        toggleListening={toggleListening}
        isSpotifyVisible={isSpotifyVisible}
        setIsSpotifyVisible={setIsSpotifyVisible}
      />
      {/* Spotify Component */}
      {isSpotifyVisible && (
        <WebPlayback fetchSpotifyToken={fetchSpotifyToken} />
      )}

      {/* Conditionally render Spotify Login button */}
      {!isSpotifyLoggedIn && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#282828',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
          }}
        >
          <button className="btn-spotify" onClick={handleSpotifyLogin}>
            Login with Spotify
          </button>
        </div>
      )}
    </Flex>
  );
}

export default Jarvis;
