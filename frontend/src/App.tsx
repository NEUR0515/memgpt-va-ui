import React from 'react';
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import theme from './theme'; // Import the custom theme
import Login from './Login';
import Jarvis from './Jarvis';
import ProtectedRoute from './ProtectedRoute';
import Register from './Register';
import Logout from './Logout';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/frontend" 
            element={
              <ProtectedRoute>
                <Jarvis />
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