// src/components/Login.js
import React from 'react';

function Login() {
  const handleLogin = async () => {
    const response = await fetch('/auth/login');
    const data = await response.json();
    window.location.href = data.auth_url;  // Redirect to Spotify's login page
  };

  return (
    <button onClick={handleLogin}>
      Login with Spotify
    </button>
  );
}

export default Login;
