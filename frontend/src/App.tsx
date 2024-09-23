import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';  // Your login component
import Jarvis from './Jarvis';  // Your main app component
import ProtectedRoute from './ProtectedRoute';  // Protected route component
import Register from './Register';
import Logout from './Logout';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route for login */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Protected route for Jarvis */}
        <Route 
          path="/frontend" 
          element={
            <ProtectedRoute>
              <Jarvis />  {/* This is the protected Jarvis component */}
            </ProtectedRoute>
          } 
        />
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </Router>
  );
}

export default App;
