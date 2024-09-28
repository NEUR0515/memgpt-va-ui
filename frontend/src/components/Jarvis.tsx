import React, { useState, useRef, useEffect } from 'react';
import { Flex, Box, useDisclosure, useColorModeValue, useBreakpointValue } from '@chakra-ui/react';
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
import { useSearchParams, useLocation } from 'react-router-dom';

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



function Jarvis() {
  const { isOpen: isLeftPanelOpen, onToggle: toggleLeftPanel } = useDisclosure();
  const { isOpen: isRightPanelOpen, onToggle: toggleRightPanel } = useDisclosure();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastPlayedMessage, setLastPlayedMessage] = useState<string | null>(null);  // Track the last played message
  const [isPageReloaded, setIsPageReloaded] = useState(true); // New flag to track if messages are from localStorage
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);  // Add profilePicture state

  // TTS state, synchronized with localStorage
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    const savedTtsPreference = localStorage.getItem('ttsEnabled');
    return savedTtsPreference ? JSON.parse(savedTtsPreference) : true;  // Default to true
  });

  // State for microphone listening
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState(''); // Transcription state

  const [spotifyToken, setSpotifyToken] = useState('');
  const [searchParams] = useSearchParams();
  const showSpotifyPlayer = useBreakpointValue({ base: false, md: false, lg: true }); // Hide on mobile (base) and on medium (md)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024); // Detect screen width

  // Update isMobile when the window is resized
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if the access_token is in the URL params
  useEffect(() => {
    const token = searchParams.get('access_token');
    if (token) {
      setSpotifyToken(token);
      localStorage.setItem('spotifyToken', token); // Store token in localStorage
    } else {
      const storedToken = localStorage.getItem('spotifyToken');
      if (storedToken) {
        setSpotifyToken(storedToken);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
        console.log("Messages loaded from localStorage:");
      } catch (error) {
        console.error("Error parsing saved messages:", error);
      }
    }
  
    // Immediately set this flag to false after loading messages
    setIsPageReloaded(false);
  }, []);  // Only load messages once, on component mount

  // Store messages in localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
      console.log("Messages saved to localStorage:");
    }
  }, [messages]);  // Only update when messages change

  // WebSocket connection setup with proper initialization
  const [ws, setWs] = useState<WebSocket | null>(null);

// Fetch user info (username and profile picture)
useEffect(() => {
  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/login';
      return;
    }

    try {
      const response = await fetch('/api/user-profile', {  // Adjust endpoint as per your backend
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.status === 403) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        const data = await response.json();
        setUsername(data.username);
        setFirstName(data.first_name);
        setProfilePicture(data.profile_picture || '/img/default-avatar.png');  // Set profile picture or fallback to default
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  fetchUserProfile();
}, []);  // Run once when the component mounts

  useEffect(() => {
    const token = localStorage.getItem("token");  // Get the token from localStorage or wherever it's stored
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // const webSocket = new WebSocket(`${process.env.REACT_APP_WS_URL}?token=${token}`);
    const webSocket = new WebSocket(`${protocol}://${window.location.host}/ws?token=${token}`);
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
  }, []);  // Ensure WebSocket connection is made on component mount

  // Function to fetch and play the TTS MP3
  const playTTSResponse = async () => {
    if (!isTtsEnabled) {
      console.log("TTS is disabled, skipping playback.");
      return;
    }

    try {
      const token = localStorage.getItem('token');  // Assuming the token is stored in localStorage
      if (!token) {
        console.log('No token found');
        return;
      }

      // Fetch the TTS MP3 from the server
      const response = await fetch('/api/play-tts', {
        headers: {
          'Authorization': `Bearer ${token}`,  // Pass the token in the headers
        },
      });

      if (!response.ok) {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();  // Automatically play the audio
    } catch (error) {
      console.error('Error playing TTS audio:', error);
    }
  };

  const handleIncomingMessage = (data: any) => {
    if (data.type === 'thought') {
      const thoughtMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Thought',
        type: 'thought'
      };
      setMessages((prevMessages) => [...prevMessages, thoughtMessage]);
      scrollToBottom();
    } else {
      const aiMessage: Message = {
        role: 'ai',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        name: 'Jarvis'
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      scrollToBottom();
  
      // Simplified check, only play TTS if it's a new message
      if (isTtsEnabled && data.message !== lastPlayedMessage) {
        scrollToBottom();
        playTTSResponse();
        setLastPlayedMessage(data.message);

      }
    }
  };

  const handleSendMessage = (message: string) => {
    // Sanitize the user's input to remove any unwanted HTML or Markdown
    const sanitizedMessage = sanitizeHtml(message, {
      allowedTags: [],  // No HTML tags allowed (plain text only)
      allowedAttributes: {}, // No attributes allowed
    });
  
    const userMessage: Message = {
      role: 'user',
      content: sanitizedMessage,  // Use sanitized message content
      timestamp: new Date().toLocaleTimeString(),
      name: username ?? 'User',  // Use the username or default to 'User'
    };
  
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: userMessage.content }));
      setMessages((prevMessages) => [...prevMessages, userMessage]);
    } else {
      console.error("WebSocket is not open. Cannot send message.");
    }
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/upload', {
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

  // Send final transcription as a message and stop listening
  if (finalTranscription) {
    handleSendMessage(finalTranscription);
    setTranscription('');  // Clear transcription
    recognition.stop();    // Stop the microphone after the message is sent
    setIsListening(false); // Update the state to reflect the mic is no longer listening
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

  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  return (
    <Flex direction="column" height="100vh">
      <Header isTtsEnabled={isTtsEnabled} setIsTtsEnabled={setIsTtsEnabled}/>
      <Flex
        flex="1"
        overflow="hidden"
        direction={{ base: 'column', md: 'row' }}  // Mobile view: Column, Desktop: Row
      >
        {isLeftPanelOpen && (
          <Box
            width={{ base: '100%', md: '20%' }}  // Full width on mobile
            bg={bgColor}
            color={textColor}
            p={4}
            overflowY="auto"
          >
            <FileUploader onFileUpload={handleFileUpload} />
          </Box>
        )}
        <Box flex="1" bg={bgColor} p={4}>
          <ChatWindow messages={messages} messagesEndRef={messagesEndRef} username={username ?? 'User'} profilePicture={profilePicture} firstName={firstName ?? 'Name'} />
        </Box>
        {isRightPanelOpen && (
          <Box
            width={{ base: '100%', md: '20%' }}  // Full width on mobile
            bg={bgColor}
            p={4}
            overflowY="auto"
          >
            {/* Render the CalendarSection and TaskSection inside the right panel */}
            <CalendarSection />
            <TaskManager />
          </Box>
        )}
      </Flex>
      <LiveTranscription transcription={transcription} />
      <MessageInput
        setMessages={setMessages}
        onSendMessage={handleSendMessage}
        toggleLeftPanel={toggleLeftPanel}
        toggleRightPanel={toggleRightPanel}
        audioLevel={audioLevel}
        isListening={isListening}
        toggleListening={toggleListening}
      />
      {/* Conditionally render the Spotify button based on isMobile */}
      {!isMobile && showSpotifyPlayer===true &&(
        <div>
          {spotifyToken ? (
            <WebPlayback token={spotifyToken} />
          ) : (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#282828', color: 'white', padding: '10px', borderRadius: '8px' }}>
              <a className="btn-spotify" href="/auth/login">
                Login with Spotify
              </a>
            </div>
          )}
        </div>
      )}
    </Flex>
  );
}

export default Jarvis;
