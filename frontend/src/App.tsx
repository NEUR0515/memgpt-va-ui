import React from 'react';
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './components/theme'; // Import the custom theme
import Login from './components/Login';
import Jarvis from './components/Jarvis';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './components/Register';
import Logout from './components/Logout';
import UserProfile from './components/UserProfile';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/frontend" 
            element={
              <ProtectedRoute>
                <Jarvis />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;